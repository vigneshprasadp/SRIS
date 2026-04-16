"""
product_service.py — Business logic layer for Products
Flow: Route → Service → DB → Response
"""
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.domain import Product, Alert
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductStockUpdate, ProductListResponse
)


# ─── READ ────────────────────────────────────────────────────────────────────

def get_all_products(
    db: Session,
    branch_id: str = "B001",
    category: Optional[str] = None,
    search: Optional[str] = None,
    stock_status: Optional[str] = None,   # IN_STOCK | LOW_STOCK | OUT_OF_STOCK
    skip: int = 0,
    limit: int = 500,
) -> dict:
    """Return products with summary counts."""
    query = db.query(Product).filter(Product.branch_id == branch_id, Product.is_active == True)

    if category:
        query = query.filter(Product.category == category)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Product.name.ilike(pattern), Product.brand.ilike(pattern),
                Product.subcategory.ilike(pattern))
        )

    products: List[Product] = query.offset(skip).limit(limit).all()

    # Filter by computed stock_status (post-fetch, since SQLAlchemy can't compare columns directly)
    if stock_status:
        products = [p for p in products if _stock_status(p) == stock_status]

    in_stock_count  = sum(1 for p in products if _stock_status(p) == "IN_STOCK")
    low_stock_count = sum(1 for p in products if _stock_status(p) == "LOW_STOCK")
    critical_count  = sum(1 for p in products if _stock_status(p) == "OUT_OF_STOCK")

    return {
        "total":     len(products),
        "in_stock":  in_stock_count,
        "low_stock": low_stock_count,
        "critical":  critical_count,
        "items":     products,
    }


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    return db.query(Product).filter(Product.id == product_id).first()


# ─── CREATE ───────────────────────────────────────────────────────────────────

def create_product(db: Session, product: ProductCreate) -> Product:
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)

    # Auto-create low-stock alert if seeded with low stock
    _auto_alert(db, db_product)
    return db_product


# ─── UPDATE (full patch) ──────────────────────────────────────────────────────

def update_product(db: Session, product_id: int, update_data: ProductUpdate) -> Optional[Product]:
    db_product = get_product_by_id(db, product_id)
    if not db_product:
        return None

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(db_product, field, value)

    db_product.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_product)
    return db_product


# ─── STOCK UPDATE ─────────────────────────────────────────────────────────────

def update_product_stock(
    db: Session, product_id: int, stock_update: ProductStockUpdate
) -> Optional[Product]:
    db_product = get_product_by_id(db, product_id)
    if not db_product:
        return None

    db_product.stock = stock_update.stock
    db_product.updated_at = datetime.datetime.utcnow()

    # Damage alert
    if stock_update.reason == "DAMAGE":
        alert = Alert(
            product_id=db_product.id,
            alert_type="DAMAGED_ITEM",
            message=f"Damaged goods reported for {db_product.name}. Stock corrected to {stock_update.stock}.",
            severity="WARNING",
            branch_id=db_product.branch_id,
        )
        db.add(alert)

    _auto_alert(db, db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


# ─── DELETE (soft) ────────────────────────────────────────────────────────────

def delete_product(db: Session, product_id: int) -> bool:
    db_product = get_product_by_id(db, product_id)
    if not db_product:
        return False
    db_product.is_active = False
    db.commit()
    return True


# ─── INTERNAL HELPERS ─────────────────────────────────────────────────────────

def _stock_status(product: Product) -> str:
    if product.stock <= 0:
        return "OUT_OF_STOCK"
    if product.stock < product.reorder_level:
        return "LOW_STOCK"
    return "IN_STOCK"


def _auto_alert(db: Session, product: Product):
    """Create/resolve LOW_STOCK or OUT_OF_STOCK alert automatically."""
    status = _stock_status(product)

    if status in ("LOW_STOCK", "OUT_OF_STOCK"):
        existing = db.query(Alert).filter(
            Alert.product_id == product.id,
            Alert.alert_type.in_(["LOW_STOCK", "OUT_OF_STOCK"]),
            Alert.status == "ACTIVE",
        ).first()

        if not existing:
            alert_type = status
            severity   = "CRITICAL" if status == "OUT_OF_STOCK" else "WARNING"
            msg = (
                f"{'Critical: Out of stock' if status == 'OUT_OF_STOCK' else 'Low stock'} "
                f"for {product.name}. "
                f"Current: {product.stock}, Reorder level: {product.reorder_level}."
            )
            db.add(Alert(
                product_id=product.id,
                alert_type=alert_type,
                message=msg,
                severity=severity,
                branch_id=product.branch_id,
            ))
    else:
        # Resolve any existing stock alerts
        active = db.query(Alert).filter(
            Alert.product_id == product.id,
            Alert.alert_type.in_(["LOW_STOCK", "OUT_OF_STOCK"]),
            Alert.status == "ACTIVE",
        ).all()
        for a in active:
            a.status = "RESOLVED"
            a.resolved_at = datetime.datetime.utcnow()
