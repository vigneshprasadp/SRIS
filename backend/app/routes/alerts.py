"""
routes/alerts.py
GET    /api/alerts                  — list active alerts with filters
GET    /api/alerts/low-stock        — live low-stock intelligence list
GET    /api/alerts/{id}             — single alert
POST   /api/alerts                  — create manual alert
PATCH  /api/alerts/{id}/resolve     — resolve alert
DELETE /api/alerts/{id}             — hard-delete (resolved only)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.schemas import (
    AlertResponse, AlertCreate, AlertLowStockResponse,
    AlertListResponse, MessageResponse,
)
from app.services.alert_service import (
    get_all_alerts, get_alert_by_id, check_low_stock_alerts,
    create_alert, resolve_alert, delete_alert,
)

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


# ── LIST ──────────────────────────────────────────────────────────────────────
@router.get("", response_model=AlertListResponse, summary="Get all alerts with summary")
def read_alerts(
    branch_id  : str            = Query("B001"),
    status     : Optional[str] = Query("ACTIVE", description="ACTIVE | RESOLVED"),
    alert_type : Optional[str] = Query(None),
    severity   : Optional[str] = Query(None, description="CRITICAL | WARNING | INFO"),
    skip       : int           = Query(0, ge=0),
    limit      : int           = Query(200, ge=1, le=500),
    db         : Session       = Depends(get_db),
):
    return get_all_alerts(db, branch_id, status, alert_type, severity, skip, limit)


# ── LOW STOCK INTELLIGENCE ────────────────────────────────────────────────────
@router.get(
    "/low-stock",
    response_model=List[AlertLowStockResponse],
    summary="Live low-stock intelligence — ordered by urgency",
)
def get_low_stock(branch_id: str = Query("B001"), db: Session = Depends(get_db)):
    return check_low_stock_alerts(db, branch_id)


# ── SINGLE ────────────────────────────────────────────────────────────────────
@router.get("/{alert_id}", response_model=AlertResponse, summary="Get alert by ID")
def read_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return alert


# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", response_model=AlertResponse, status_code=201, summary="Create a manual alert")
def add_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    return create_alert(db, alert)


# ── RESOLVE ───────────────────────────────────────────────────────────────────
@router.patch("/{alert_id}/resolve", response_model=AlertResponse, summary="Resolve an alert")
def resolve(alert_id: int, db: Session = Depends(get_db)):
    resolved = resolve_alert(db, alert_id)
    if not resolved:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    return resolved


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{alert_id}", response_model=MessageResponse, summary="Delete a resolved alert")
def remove_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = get_alert_by_id(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    if alert.status == "ACTIVE":
        raise HTTPException(status_code=400, detail="Cannot delete an active alert. Resolve it first.")
    success = delete_alert(db, alert_id)
    return {"message": f"Alert {alert_id} deleted successfully."}
