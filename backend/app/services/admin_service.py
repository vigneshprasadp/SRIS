"""
app/services/admin_service.py
──────────────────────────────────────────────────────────────────
Phase 4 — Super Admin / Enterprise Intelligence Service

Provides:
  • Cross-branch aggregation
  • Global revenue summary
  • Branch performance ranking
  • Global low-stock alerts
  • AI global insights (cross-branch)
  • Stock transfer between branches
  • Warehouse dispatch to branch
"""
import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.domain import (
    Branch, BranchSummary, BranchRevenue, BranchMetrics,
    Product, Employee, Alert, SaleTransaction, SaleItem,
    StockTransfer, Warehouse,
)

# ─── BRANCH REGISTRY ──────────────────────────────────────────────────────────
# Synthetic multi-branch data (until each branch has a live DB)
BRANCH_META = [
    {"branch_code": "B001", "name": "DMart Whitefield",     "city": "Bengaluru", "location": "Whitefield Main Rd",     "status": "ACTIVE"},
    {"branch_code": "B002", "name": "DMart Indiranagar",    "city": "Bengaluru", "location": "100 Feet Rd, Indiranagar","status": "ACTIVE"},
    {"branch_code": "B003", "name": "DMart Koramangala",    "city": "Bengaluru", "location": "Koramangala 6th Block",  "status": "ACTIVE"},
    {"branch_code": "B004", "name": "DMart HSR Layout",     "city": "Bengaluru", "location": "27th Main, HSR Layout",  "status": "ACTIVE"},
    {"branch_code": "B005", "name": "DMart Jayanagar",      "city": "Bengaluru", "location": "11th Block, Jayanagar",  "status": "ACTIVE"},
    {"branch_code": "B006", "name": "DMart Electronic City","city": "Bengaluru", "location": "Phase 2, Electronic City","status": "ACTIVE"},
    {"branch_code": "B007", "name": "DMart Malleshwaram",   "city": "Bengaluru", "location": "Sampige Rd, Malleswaram","status": "RENOVATING"},
]

# Synthetic revenue multipliers per branch (relative to B001 seed data)
BRANCH_REVENUE_MULTIPLIERS = {
    "B001": 1.00, "B002": 1.35, "B003": 1.18, "B004": 0.92,
    "B005": 0.87, "B006": 0.74, "B007": 0.61,
}

random.seed(42)


def _ensure_branches(db: Session):
    """Seed branch registry if empty."""
    if db.query(Branch).count() == 0:
        managers = db.query(Employee).filter(Employee.role.in_(["Floor Manager", "Billing Manager", "Department Head"])).all()
        for i, meta in enumerate(BRANCH_META):
            mgr_id = managers[i % len(managers)].id if managers else None
            db.add(Branch(
                branch_code=meta["branch_code"],
                name=meta["name"],
                location=meta["location"],
                city=meta["city"],
                status=meta["status"],
                manager_id=mgr_id,
                opening_date=datetime.datetime(2016, 1, 1) + datetime.timedelta(days=i * 365),
            ))
        db.commit()


def _ensure_warehouse(db: Session):
    """Seed warehouse stock if empty."""
    if db.query(Warehouse).count() == 0:
        WAREHOUSE_ITEMS = [
            ("Amul Full Cream Milk 1L", "Dairy",        2000, "Amul Dairy Co.",    "L"),
            ("Fortune Sunflower Oil 1L","Grocery",      1500, "Adani Wilmar",      "L"),
            ("Aashirvaad Atta 5kg",     "Grocery",      1200, "ITC Foods",         "kg"),
            ("Britannia Good Day 200g", "Bakery",       3000, "Britannia Ltd",     "g"),
            ("Bisleri Water 2L (6pk)",  "Beverages",    2500, "Bisleri Int.",      "pcs"),
            ("Lay's Classic Salted",    "Snacks",       4000, "PepsiCo India",     "g"),
            ("Surf Excel Matic 1kg",    "Household",    800,  "Hindustan Unilever","kg"),
            ("Colgate MaxFresh 300g",   "Personal Care",1600, "Colgate-Palmolive", "g"),
            ("India Gate Rice 5kg",     "Grocery",      900,  "KRBL India",        "kg"),
            ("Cadbury Dairy Milk 160g", "Snacks",       2200, "Mondelez India",    "g"),
        ]
        for name, cat, stock, supplier, unit in WAREHOUSE_ITEMS:
            db.add(Warehouse(
                product_name=name, category=cat,
                total_stock=stock, incoming_stock=stock, outgoing_stock=0,
                supplier=supplier, unit=unit, reorder_level=200,
                last_restocked=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 14)),
            ))
        db.commit()


# ─── GET ALL BRANCHES ─────────────────────────────────────────────────────────
def get_all_branches(db: Session) -> list:
    _ensure_branches(db)
    branches = db.query(Branch).all()

    # Aggregate real revenue from BranchRevenue for B001; synthetic for others
    b001_total = db.query(func.sum(BranchRevenue.daily_revenue)).filter(
        BranchRevenue.branch_id == "B001"
    ).scalar() or 0.0

    b001_orders = db.query(func.sum(BranchRevenue.daily_orders)).filter(
        BranchRevenue.branch_id == "B001"
    ).scalar() or 0

    result = []
    for b in branches:
        mult = BRANCH_REVENUE_MULTIPLIERS.get(b.branch_code, 0.8)
        rev = round(b001_total * mult, 2)
        orders = int(b001_orders * mult)
        avg_ov = round(rev / orders, 2) if orders > 0 else 0
        staff_count = db.query(Employee).filter(
            Employee.branch_id == b.branch_code, Employee.is_active == True
        ).count() if b.branch_code == "B001" else random.randint(18, 45)

        result.append({
            "branch_id":   b.id,
            "branch_code": b.branch_code,
            "name":        b.name,
            "location":    b.location,
            "city":        b.city,
            "status":      b.status,
            "revenue":     rev,
            "orders":      orders,
            "avg_order_value": avg_ov,
            "staff_count": staff_count,
            "opening_date": b.opening_date.strftime("%Y-%m-%d") if b.opening_date else None,
        })
    return result


# ─── GLOBAL REVENUE SUMMARY ───────────────────────────────────────────────────
def get_global_revenue_summary(db: Session) -> dict:
    branches = get_all_branches(db)
    total_revenue = sum(b["revenue"] for b in branches)
    total_orders  = sum(b["orders"]  for b in branches)
    active_branches = sum(1 for b in branches if b["status"] == "ACTIVE")
    avg_ov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0

    # Month-over-month synthetic growth
    growth_pct = round(random.uniform(4.5, 12.8), 1)

    return {
        "total_revenue":    round(total_revenue, 2),
        "total_orders":     total_orders,
        "avg_order_value":  avg_ov,
        "active_branches":  active_branches,
        "total_branches":   len(branches),
        "mom_growth_pct":   growth_pct,
    }


# ─── BRANCH PERFORMANCE RANKING ───────────────────────────────────────────────
def get_branch_performance(db: Session) -> list:
    branches = get_all_branches(db)
    ranked = sorted(branches, key=lambda b: b["revenue"], reverse=True)
    # Attach rank and synthetic stock health score
    for i, b in enumerate(ranked):
        b["rank"] = i + 1
        b["stock_health_score"] = round(random.uniform(60, 98), 1)
        b["growth_pct"] = round(random.uniform(-5.0, 18.0), 1)
    return ranked


# ─── GLOBAL LOW-STOCK ALERTS ──────────────────────────────────────────────────
def get_global_low_stock(db: Session) -> list:
    """Real low-stock for B001 + synthetic for others."""
    alerts = []

    # Real data for B001
    low_prods = db.query(Product).filter(
        Product.branch_id == "B001",
        Product.is_active == True,
        Product.stock < Product.reorder_level,
    ).all()
    for p in low_prods:
        alerts.append({
            "branch_code": "B001",
            "branch_name": "DMart Whitefield",
            "product_id":  p.id,
            "product":     p.name,
            "category":    p.category,
            "stock":       p.stock,
            "reorder_level": p.reorder_level,
            "severity":    "CRITICAL" if p.stock <= 0 else "WARNING",
        })

    # Synthetic for other branches
    SYNTHETIC_PRODUCTS = [
        "Amul Butter 500g", "Lay's Classic 100g", "Britannia Bread",
        "Red Bull 250ml", "Dettol Handwash 200ml", "Colgate 300g",
        "Tropicana 1L", "Surf Excel 1kg",
    ]
    _ensure_branches(db)
    other_branches = db.query(Branch).filter(Branch.branch_code != "B001").all()
    random.seed(77)
    for branch in other_branches:
        if branch.status == "RENOVATING":
            continue
        n_alerts = random.randint(1, 4)
        for prod_name in random.sample(SYNTHETIC_PRODUCTS, min(n_alerts, len(SYNTHETIC_PRODUCTS))):
            stock = random.randint(0, 12)
            reorder = random.randint(15, 30)
            alerts.append({
                "branch_code": branch.branch_code,
                "branch_name": branch.name,
                "product_id":  None,
                "product":     prod_name,
                "category":    "Various",
                "stock":       stock,
                "reorder_level": reorder,
                "severity":    "CRITICAL" if stock <= 0 else "WARNING",
            })

    return sorted(alerts, key=lambda a: (a["severity"] == "WARNING", a["stock"]))


# ─── AI GLOBAL INSIGHTS ───────────────────────────────────────────────────────
def get_ai_global_insights(db: Session) -> dict:
    """Aggregate Phase-3 AI outputs across the chain."""
    # Top products (from real B001 sales data)
    top_rows = (
        db.query(Product.name, func.sum(SaleItem.quantity).label("total_sold"))
        .join(SaleItem, SaleItem.product_id == Product.id)
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )
    top_products = [{"name": r.name, "sold": int(r.total_sold)} for r in top_rows]

    # Dead stock (low turnover products in B001)
    dead_prods = (
        db.query(Product.name, Product.stock, Product.category)
        .outerjoin(SaleItem, SaleItem.product_id == Product.id)
        .filter(Product.is_active == True, Product.branch_id == "B001")
        .group_by(Product.id)
        .having(func.coalesce(func.sum(SaleItem.quantity), 0) < 5)
        .limit(5)
        .all()
    )
    dead_stock = [{"name": r.name, "stock": r.stock, "category": r.category} for r in dead_prods]

    # Demand spikes
    cutoff_3d  = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    cutoff_10d = datetime.datetime.utcnow() - datetime.timedelta(days=10)
    recent_rows = (
        db.query(Product.name, func.sum(SaleItem.quantity).label("qty"))
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(SaleTransaction, SaleTransaction.id == SaleItem.transaction_id)
        .filter(SaleTransaction.sale_date >= cutoff_3d)
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )
    demand_spikes = [{"name": r.name, "qty_3d": int(r.qty)} for r in recent_rows]

    # Low performing branch (synthetic, B007 is in renovation)
    branches = get_branch_performance(db)
    low_branch = branches[-1] if branches else {}

    # Prediction accuracy metric (synthetic)
    pred_accuracy = round(random.uniform(82.0, 94.5), 1)

    return {
        "top_products":          top_products,
        "dead_stock":            dead_stock,
        "demand_spikes":         demand_spikes,
        "low_performing_branch": {
            "name":    low_branch.get("name", ""),
            "revenue": low_branch.get("revenue", 0),
            "rank":    low_branch.get("rank", len(branches)),
        },
        "prediction_accuracy":   pred_accuracy,
        "total_ai_alerts":       db.query(Alert).filter(Alert.status == "ACTIVE").count(),
        "chain_insights": [
            "Cold drinks demand rising across Bengaluru branches",
            "Dairy products show 18% higher weekend sales chain-wide",
            "Whitefield & Indiranagar branches drive 42% of total revenue",
            "Dead stock in Clothing category detected in 3 southern branches",
            "Automated restock recommended for Beverages across 5 branches",
        ],
    }


# ─── STOCK TRANSFER ───────────────────────────────────────────────────────────
def transfer_stock(db: Session, from_branch: str, to_branch: str,
                   product_id: int, quantity: int, notes: str = "") -> dict:
    """Move stock between branches. Only B001 has real product rows."""
    if from_branch == to_branch:
        return {"error": "Source and destination branches must differ."}
    if quantity <= 0:
        return {"error": "Quantity must be positive."}

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": f"Product id={product_id} not found."}

    if product.branch_id == from_branch:
        if product.stock < quantity:
            return {"error": f"Insufficient stock. Available: {product.stock}, Requested: {quantity}."}
        product.stock -= quantity

    transfer = StockTransfer(
        from_branch=from_branch,
        to_branch=to_branch,
        product_id=product_id,
        quantity=quantity,
        status="COMPLETED",
        notes=notes,
        date=datetime.datetime.utcnow(),
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    return {
        "transfer_id":  transfer.id,
        "from_branch":  from_branch,
        "to_branch":    to_branch,
        "product_id":   product_id,
        "product_name": product.name,
        "quantity":     quantity,
        "status":       "COMPLETED",
        "date":         transfer.date.isoformat(),
    }


# ─── WAREHOUSE DISPATCH ───────────────────────────────────────────────────────
def warehouse_dispatch(db: Session, warehouse_item_id: int,
                       to_branch: str, quantity: int) -> dict:
    """Send stock from warehouse to a branch."""
    item = db.query(Warehouse).filter(Warehouse.id == warehouse_item_id).first()
    if not item:
        return {"error": f"Warehouse item id={warehouse_item_id} not found."}
    if item.total_stock < quantity:
        return {"error": f"Insufficient warehouse stock. Available: {item.total_stock}."}

    item.total_stock    -= quantity
    item.outgoing_stock += quantity
    item.updated_at      = datetime.datetime.utcnow()

    db.commit()
    return {
        "warehouse_item":     item.product_name,
        "dispatched_to":      to_branch,
        "quantity":           quantity,
        "remaining_stock":    item.total_stock,
        "status":             "DISPATCHED",
    }


# ─── WAREHOUSE INVENTORY ──────────────────────────────────────────────────────
def get_warehouse_inventory(db: Session) -> list:
    _ensure_warehouse(db)
    items = db.query(Warehouse).all()
    return [
        {
            "id":            w.id,
            "product_name":  w.product_name,
            "category":      w.category,
            "total_stock":   w.total_stock,
            "incoming_stock":w.incoming_stock,
            "outgoing_stock":w.outgoing_stock,
            "supplier":      w.supplier,
            "unit":          w.unit,
            "reorder_level": w.reorder_level,
            "last_restocked": w.last_restocked.strftime("%Y-%m-%d") if w.last_restocked else None,
            "stock_status":  "CRITICAL" if w.total_stock < w.reorder_level * 0.5
                             else "LOW" if w.total_stock < w.reorder_level
                             else "OK",
        }
        for w in items
    ]


# ─── STOCK TRANSFER HISTORY ───────────────────────────────────────────────────
def get_transfer_history(db: Session, limit: int = 50) -> list:
    transfers = db.query(StockTransfer).order_by(StockTransfer.date.desc()).limit(limit).all()
    return [
        {
            "id":          t.id,
            "from_branch": t.from_branch,
            "to_branch":   t.to_branch,
            "product":     t.product.name if t.product else "Unknown",
            "quantity":    t.quantity,
            "status":      t.status,
            "date":        t.date.strftime("%Y-%m-%d %H:%M"),
            "notes":       t.notes,
        }
        for t in transfers
    ]


# ─── BRANCH DEEP DIVE ─────────────────────────────────────────────────────────
def get_branch_deep_dive(db: Session, branch_code: str) -> dict:
    """Detailed view for a single branch (real for B001, synthetic otherwise)."""
    branches = get_all_branches(db)
    branch_info = next((b for b in branches if b["branch_code"] == branch_code), None)
    if not branch_info:
        return {"error": f"Branch {branch_code} not found."}

    if branch_code == "B001":
        # Real data
        total_products  = db.query(Product).filter(Product.branch_id == "B001", Product.is_active == True).count()
        low_stock_count = db.query(Product).filter(
            Product.branch_id == "B001", Product.is_active == True,
            Product.stock < Product.reorder_level).count()
        staff_total = db.query(Employee).filter(Employee.branch_id == "B001", Employee.is_active == True).count()
        top_prods = (
            db.query(Product.name, Product.category, func.sum(SaleItem.quantity).label("qty"))
            .join(SaleItem, SaleItem.product_id == Product.id)
            .filter(Product.branch_id == "B001")
            .group_by(Product.name, Product.category)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(5).all()
        )
        top_products = [{"name": r.name, "category": r.category, "sold": int(r.qty)} for r in top_prods]
        # Revenue trend (last 7 days)
        trend_rows = (
            db.query(BranchRevenue.date, BranchRevenue.daily_revenue, BranchRevenue.daily_orders)
            .filter(BranchRevenue.branch_id == "B001")
            .order_by(BranchRevenue.date.desc())
            .limit(7).all()
        )
        revenue_trend = [{"date": r.date, "revenue": r.daily_revenue, "orders": r.daily_orders} for r in reversed(trend_rows)]
    else:
        # Synthetic data for other branches
        mult = BRANCH_REVENUE_MULTIPLIERS.get(branch_code, 0.8)
        b001_total = db.query(func.sum(BranchRevenue.daily_revenue)).filter(
            BranchRevenue.branch_id == "B001").scalar() or 0
        total_products  = random.randint(40, 60)
        low_stock_count = random.randint(2, 10)
        staff_total     = branch_info["staff_count"]
        top_products = [
            {"name": "Amul Milk 1L",      "category": "Dairy",    "sold": int(random.randint(800, 2000) * mult)},
            {"name": "Lay's Salted 100g",  "category": "Snacks",   "sold": int(random.randint(600, 1500) * mult)},
            {"name": "Aashirvaad Atta 5kg","category": "Grocery",  "sold": int(random.randint(400, 1000) * mult)},
            {"name": "Parle-G 800g",       "category": "Bakery",   "sold": int(random.randint(500, 1200) * mult)},
            {"name": "Bisleri Water 2L",   "category": "Beverages","sold": int(random.randint(300, 800)  * mult)},
        ]
        revenue_trend = []
        for i in range(7, 0, -1):
            d = datetime.date.today() - datetime.timedelta(days=i)
            daily = round(random.uniform(40000, 80000) * mult, 2)
            revenue_trend.append({"date": d.strftime("%Y-%m-%d"), "revenue": daily, "orders": random.randint(30, 80)})

    stock_health = round(max(0, 100 - (low_stock_count / max(total_products, 1)) * 100), 1)

    return {
        **branch_info,
        "total_products":  total_products,
        "low_stock_count": low_stock_count,
        "staff_total":     staff_total,
        "top_products":    top_products,
        "revenue_trend":   revenue_trend,
        "stock_health":    stock_health,
    }
