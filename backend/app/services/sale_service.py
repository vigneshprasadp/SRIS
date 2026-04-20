"""
services/sale_service.py
Atomic transaction engine for POS billing.

Flow:
  validate request → validate stock → calculate totals → generate invoice
  → save transaction + items → reduce stock → update revenue → log payment
  → return full invoice object

Everything runs in a SINGLE DB transaction (atomic).
"""
import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException

from app.models.domain import (
    Product, Employee, BranchSummary,
    SaleTransaction, SaleItem, BranchRevenue, PaymentLog,
)
from app.schemas.schemas import SaleCreateRequest, SaleTransactionOut, SaleItemOut


# ─────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────
def _date_str(dt: datetime.datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _generate_invoice_number(db: Session, branch_id: str, sale_date: datetime.datetime) -> str:
    """Generate unique invoice: INV-B001-20260416-0001"""
    date_str = sale_date.strftime("%Y%m%d")
    # count today's transactions for this branch
    count = db.query(SaleTransaction).filter(
        SaleTransaction.branch_id == branch_id,
        func.strftime("%Y%m%d", SaleTransaction.sale_date) == date_str,
    ).count()
    seq = str(count + 1).zfill(4)
    safe_branch = branch_id.replace("-", "")
    return f"INV-{safe_branch}-{date_str}-{seq}"


def _upsert_revenue(db: Session, branch_id: str, sale_date: datetime.datetime,
                    amount: float):
    """Add amount to today's BranchRevenue row (create if missing)."""
    date_str = _date_str(sale_date)
    row = db.query(BranchRevenue).filter(
        BranchRevenue.branch_id == branch_id,
        BranchRevenue.date == date_str,
    ).first()
    if row:
        row.daily_revenue += amount
        row.daily_orders  += 1
    else:
        db.add(BranchRevenue(
            branch_id=branch_id,
            date=date_str,
            daily_revenue=amount,
            daily_orders=1,
        ))


def _update_branch_summary(db: Session, branch_id: str, amount: float):
    """Keep BranchSummary.today_revenue + monthly_revenue in sync."""
    summary = db.query(BranchSummary).filter(
        BranchSummary.branch_id == branch_id
    ).first()
    if summary:
        summary.today_revenue   = (summary.today_revenue or 0.0) + amount
        summary.monthly_revenue = (summary.monthly_revenue or 0.0) + amount


def _build_transaction_out(txn: SaleTransaction) -> SaleTransactionOut:
    """Serialize a SaleTransaction ORM object to Pydantic response."""
    items_out = []
    for item in txn.items:
        product_name = item.product.name if item.product else "Deleted Product"
        items_out.append(SaleItemOut(
            product_id   = item.product_id,
            product_name = product_name,
            quantity     = item.quantity,
            unit_price   = item.unit_price,
            subtotal     = item.subtotal,
        ))
    cashier_name = txn.cashier.name if txn.cashier else None
    return SaleTransactionOut(
        id             = txn.id,
        invoice_number = txn.invoice_number,
        branch_id      = txn.branch_id,
        cashier_id     = txn.cashier_id,
        cashier_name   = cashier_name,
        total_amount   = txn.total_amount,
        payment_mode   = txn.payment_mode,
        sale_date      = txn.sale_date,
        items          = items_out,
    )


# ─────────────────────────────────────────────────────────────────
#  CORE: CREATE SALE (atomic)
# ─────────────────────────────────────────────────────────────────
def create_sale(db: Session, payload: SaleCreateRequest) -> SaleTransactionOut:
    # ── STEP 1: validate branch ──────────────────────────────────
    branch = db.query(BranchSummary).filter(
        BranchSummary.branch_id == payload.branch_id
    ).first()
    if not branch:
        raise HTTPException(status_code=404, detail=f"Branch '{payload.branch_id}' not found")

    # ── STEP 2: validate cashier (optional) ─────────────────────
    cashier = None
    if payload.cashier_id:
        cashier = db.query(Employee).filter(Employee.id == payload.cashier_id).first()
        if not cashier:
            raise HTTPException(status_code=404, detail=f"Cashier ID {payload.cashier_id} not found")

    # ── STEP 3: load + validate products and stock ───────────────
    product_map: dict[int, Product] = {}
    for item_in in payload.products:
        prod = db.query(Product).filter(
            Product.id == item_in.product_id,
            Product.branch_id == payload.branch_id,
            Product.is_active == True,
        ).first()
        if not prod:
            raise HTTPException(
                status_code=404,
                detail=f"Product ID {item_in.product_id} not found in branch {payload.branch_id}"
            )
        if prod.stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{prod.name}'. Available: {prod.stock}, Requested: {item_in.quantity}"
            )
        product_map[item_in.product_id] = prod

    # ── STEP 4: calculate totals ─────────────────────────────────
    sale_date   = datetime.datetime.utcnow()
    total       = 0.0
    line_items  = []   # [(product, quantity, unit_price, subtotal)]

    for item_in in payload.products:
        prod     = product_map[item_in.product_id]
        subtotal = round(prod.price * item_in.quantity, 2)
        total   += subtotal
        line_items.append((prod, item_in.quantity, prod.price, subtotal))

    total = round(total, 2)

    # ── STEP 5: generate invoice number ─────────────────────────
    invoice_number = _generate_invoice_number(db, payload.branch_id, sale_date)

    # ── STEP 6: save SaleTransaction ────────────────────────────
    txn = SaleTransaction(
        branch_id      = payload.branch_id,
        cashier_id     = payload.cashier_id,
        invoice_number = invoice_number,
        total_amount   = total,
        payment_mode   = payload.payment_mode,
        sale_date      = sale_date,
    )
    db.add(txn)
    db.flush()   # get txn.id without committing

    # ── STEP 7: save SaleItems ───────────────────────────────────
    for prod, qty, unit_price, subtotal in line_items:
        db.add(SaleItem(
            transaction_id = txn.id,
            product_id     = prod.id,
            quantity       = qty,
            unit_price     = unit_price,
            subtotal       = subtotal,
        ))

    # ── STEP 8: reduce stock ─────────────────────────────────────
    for prod, qty, _, _ in line_items:
        prod.stock = max(0, prod.stock - qty)
        prod.updated_at = sale_date

    # ── STEP 9: log payment ──────────────────────────────────────
    db.add(PaymentLog(
        transaction_id = txn.id,
        payment_status = "SUCCESS",
        payment_mode   = payload.payment_mode,
        timestamp      = sale_date,
    ))

    # ── STEP 10: update revenue ──────────────────────────────────
    _upsert_revenue(db, payload.branch_id, sale_date, total)
    _update_branch_summary(db, payload.branch_id, total)

    # ── COMMIT ───────────────────────────────────────────────────
    db.commit()
    db.refresh(txn)

    return _build_transaction_out(txn)


# ─────────────────────────────────────────────────────────────────
#  SALES HISTORY
# ─────────────────────────────────────────────────────────────────
def get_sales_history(db: Session, branch_id: str, limit: int = 50):
    txns = (
        db.query(SaleTransaction)
        .filter(SaleTransaction.branch_id == branch_id)
        .order_by(SaleTransaction.sale_date.desc())
        .limit(limit)
        .all()
    )
    total = db.query(SaleTransaction).filter(
        SaleTransaction.branch_id == branch_id
    ).count()
    return total, [_build_transaction_out(t) for t in txns]


# ─────────────────────────────────────────────────────────────────
#  TOP SELLING PRODUCTS
# ─────────────────────────────────────────────────────────────────
def get_top_products(db: Session, branch_id: str, days: int = 7, top_n: int = 10):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    rows = (
        db.query(
            SaleItem.product_id,
            Product.name.label("product_name"),
            Product.category,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.subtotal).label("total_revenue"),
        )
        .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
        .join(Product, SaleItem.product_id == Product.id)
        .filter(
            SaleTransaction.branch_id == branch_id,
            SaleTransaction.sale_date >= cutoff,
        )
        .group_by(SaleItem.product_id, Product.name, Product.category)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(top_n)
        .all()
    )
    return [
        {
            "product_id"   : r.product_id,
            "product_name" : r.product_name,
            "category"     : r.category,
            "total_qty"    : int(r.total_qty),
            "total_revenue": round(float(r.total_revenue), 2),
        }
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────
#  DAILY REVENUE TREND
# ─────────────────────────────────────────────────────────────────
def get_daily_revenue(db: Session, branch_id: str, days: int = 7):
    rows = (
        db.query(BranchRevenue)
        .filter(BranchRevenue.branch_id == branch_id)
        .order_by(BranchRevenue.date.desc())
        .limit(days)
        .all()
    )
    # Return ascending order for chart
    result = sorted(rows, key=lambda r: r.date)
    return [
        {"date": r.date, "daily_revenue": r.daily_revenue, "daily_orders": r.daily_orders}
        for r in result
    ]


# ─────────────────────────────────────────────────────────────────
#  CATEGORY REVENUE BREAKDOWN
# ─────────────────────────────────────────────────────────────────
def get_category_revenue(db: Session, branch_id: str, days: int = 7):
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=days)
    rows = (
        db.query(
            Product.category,
            func.sum(SaleItem.subtotal).label("revenue"),
            func.count(SaleTransaction.id.distinct()).label("orders"),
        )
        .join(SaleItem, Product.id == SaleItem.product_id)
        .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
        .filter(
            SaleTransaction.branch_id == branch_id,
            SaleTransaction.sale_date >= cutoff,
        )
        .group_by(Product.category)
        .order_by(func.sum(SaleItem.subtotal).desc())
        .all()
    )
    return [
        {"category": r.category, "revenue": round(float(r.revenue), 2), "orders": int(r.orders)}
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────
#  BRANCH INTELLIGENCE
# ─────────────────────────────────────────────────────────────────
def get_sales_intelligence(db: Session, branch_id: str):
    today_str = _date_str(datetime.datetime.utcnow())
    week_ago  = datetime.datetime.utcnow() - datetime.timedelta(days=7)

    # Today's stats
    today_row = db.query(BranchRevenue).filter(
        BranchRevenue.branch_id == branch_id,
        BranchRevenue.date == today_str,
    ).first()

    today_orders  = today_row.daily_orders  if today_row else 0
    today_revenue = today_row.daily_revenue if today_row else 0.0

    # Week revenue
    week_rows = db.query(BranchRevenue).filter(
        BranchRevenue.branch_id == branch_id,
        BranchRevenue.date >= week_ago.strftime("%Y-%m-%d"),
    ).all()
    week_revenue = sum(r.daily_revenue for r in week_rows)

    avg_order_value = round(today_revenue / today_orders, 2) if today_orders > 0 else 0.0

    # Top category (last 7 days)
    cat_rows = get_category_revenue(db, branch_id, 7)
    top_category = cat_rows[0]["category"] if cat_rows else "N/A"

    # Top product (last 7 days)
    prod_rows = get_top_products(db, branch_id, 7, 1)
    top_product = prod_rows[0]["product_name"] if prod_rows else "N/A"

    # Payment mode breakdown (today)
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    pay_rows = (
        db.query(SaleTransaction.payment_mode, func.count(SaleTransaction.id).label("cnt"))
        .filter(
            SaleTransaction.branch_id == branch_id,
            SaleTransaction.sale_date >= today_start,
        )
        .group_by(SaleTransaction.payment_mode)
        .all()
    )
    recent_payment_modes = {r.payment_mode: r.cnt for r in pay_rows}

    # Peak hour estimate (hardcoded based on typical supermarket patterns)
    hour = datetime.datetime.now().hour
    if 9 <= hour < 12:
        peak_hour = "9 AM – 12 PM (Current)"
    elif 17 <= hour < 21:
        peak_hour = "5 PM – 9 PM (Current)"
    else:
        peak_hour = "6 PM – 8 PM (Typical)"

    return {
        "today_orders"         : today_orders,
        "today_revenue"        : round(today_revenue, 2),
        "week_revenue"         : round(week_revenue, 2),
        "avg_order_value"      : avg_order_value,
        "top_category"         : top_category,
        "top_product"          : top_product,
        "peak_hour"            : peak_hour,
        "recent_payment_modes" : recent_payment_modes,
    }
