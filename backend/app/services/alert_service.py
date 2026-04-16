"""
alert_service.py — Business logic layer for Alerts
"""
import datetime
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload

from app.models.domain import Alert, Product
from app.schemas.schemas import AlertCreate, AlertLowStockResponse


# ─── READ ─────────────────────────────────────────────────────────────────────

def get_all_alerts(
    db: Session,
    branch_id: str = "B001",
    status: Optional[str] = "ACTIVE",
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
) -> dict:
    query = db.query(Alert).filter(Alert.branch_id == branch_id)

    if status:
        query = query.filter(Alert.status == status)
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    if severity:
        query = query.filter(Alert.severity == severity)

    alerts = query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

    critical = sum(1 for a in alerts if a.severity == "CRITICAL")
    warning  = sum(1 for a in alerts if a.severity == "WARNING")
    info     = sum(1 for a in alerts if a.severity == "INFO")

    return {
        "total":    len(alerts),
        "critical": critical,
        "warning":  warning,
        "info":     info,
        "items":    alerts,
    }


def get_alert_by_id(db: Session, alert_id: int) -> Optional[Alert]:
    return db.query(Alert).filter(Alert.id == alert_id).first()


# ─── LOW STOCK CHECK ──────────────────────────────────────────────────────────

def check_low_stock_alerts(
    db: Session, branch_id: str = "B001"
) -> List[AlertLowStockResponse]:
    products = (
        db.query(Product)
        .filter(
            Product.branch_id == branch_id,
            Product.is_active == True,
            Product.stock < Product.reorder_level,
        )
        .order_by(Product.stock.asc())
        .all()
    )

    result = []
    for prod in products:
        status = "OUT_OF_STOCK" if prod.stock <= 0 else "LOW_STOCK"
        result.append(AlertLowStockResponse(
            product_id=prod.id,
            product=prod.name,
            category=prod.category,
            current_stock=prod.stock,
            required_stock=prod.reorder_level,
            status=status,
        ))

        # Ensure DB alert exists
        existing = db.query(Alert).filter(
            Alert.product_id == prod.id,
            Alert.alert_type.in_(["LOW_STOCK", "OUT_OF_STOCK"]),
            Alert.status == "ACTIVE",
        ).first()

        if not existing:
            severity = "CRITICAL" if prod.stock <= 0 else "WARNING"
            db.add(Alert(
                product_id=prod.id,
                alert_type=status,
                message=(
                    f"{'Out of stock' if prod.stock <= 0 else 'Low stock'}: {prod.name}. "
                    f"Current: {prod.stock}, Reorder: {prod.reorder_level}."
                ),
                severity=severity,
                branch_id=branch_id,
            ))

    db.commit()
    return result


# ─── CREATE MANUAL ALERT ──────────────────────────────────────────────────────

def create_alert(db: Session, alert_data: AlertCreate) -> Alert:
    db_alert = Alert(**alert_data.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


# ─── RESOLVE ──────────────────────────────────────────────────────────────────

def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        return None
    alert.status = "RESOLVED"
    alert.resolved_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return alert


def resolve_all_for_product(db: Session, product_id: int) -> int:
    alerts = db.query(Alert).filter(
        Alert.product_id == product_id,
        Alert.status == "ACTIVE",
    ).all()
    for a in alerts:
        a.status = "RESOLVED"
        a.resolved_at = datetime.datetime.utcnow()
    db.commit()
    return len(alerts)


# ─── DELETE (hard — only for resolved) ───────────────────────────────────────

def delete_alert(db: Session, alert_id: int) -> bool:
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        return False
    db.delete(alert)
    db.commit()
    return True
