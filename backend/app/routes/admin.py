"""
app/routes/admin.py
──────────────────────────────────────────────────────────────────
Phase 4 — Super Admin API Routes
All under /api/admin/*
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.services import admin_service

router = APIRouter(prefix="/api/admin", tags=["Phase4 Admin"])


# ─── REQUEST SCHEMAS ──────────────────────────────────────────────────────────
class TransferRequest(BaseModel):
    from_branch: str
    to_branch:   str
    product_id:  int
    quantity:    int
    notes:       Optional[str] = ""


class WarehouseDispatchRequest(BaseModel):
    warehouse_item_id: int
    to_branch:         str
    quantity:          int


# ─── ENDPOINTS ────────────────────────────────────────────────────────────────

@router.get("/branches", summary="All branch details")
def get_branches(db: Session = Depends(get_db)):
    """Fetch all branch info including revenue and staff count."""
    return admin_service.get_all_branches(db)


@router.get("/revenue-summary", summary="Global revenue aggregation")
def revenue_summary(db: Session = Depends(get_db)):
    """Total revenue, orders, avg order value across all branches."""
    return admin_service.get_global_revenue_summary(db)


@router.get("/branch-performance", summary="Branch performance ranking")
def branch_performance(db: Session = Depends(get_db)):
    """Branches ranked by revenue DESC with growth and stock health."""
    return admin_service.get_branch_performance(db)


@router.get("/global-low-stock", summary="Low-stock alerts across all branches")
def global_low_stock(db: Session = Depends(get_db)):
    """Products below reorder level, grouped by branch."""
    return admin_service.get_global_low_stock(db)


@router.get("/ai-insights", summary="AI global intelligence insights")
def ai_global_insights(db: Session = Depends(get_db)):
    """Cross-branch AI insights: top products, dead stock, demand spikes."""
    return admin_service.get_ai_global_insights(db)


@router.get("/warehouse", summary="Central warehouse inventory")
def warehouse_inventory(db: Session = Depends(get_db)):
    """All items in the central warehouse."""
    return admin_service.get_warehouse_inventory(db)


@router.get("/transfer-history", summary="Stock transfer history")
def transfer_history(db: Session = Depends(get_db)):
    """Recent cross-branch stock movements."""
    return admin_service.get_transfer_history(db)


@router.get("/branch/{branch_code}/deep-dive", summary="Branch deep dive")
def branch_deep_dive(branch_code: str, db: Session = Depends(get_db)):
    """Detailed analytics for a specific branch."""
    result = admin_service.get_branch_deep_dive(db, branch_code.upper())
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/transfer-stock", summary="Transfer stock between branches")
def transfer_stock(req: TransferRequest, db: Session = Depends(get_db)):
    """Move stock from one branch to another."""
    result = admin_service.transfer_stock(
        db, req.from_branch.upper(), req.to_branch.upper(),
        req.product_id, req.quantity, req.notes or ""
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/warehouse-dispatch", summary="Dispatch from warehouse to branch")
def warehouse_dispatch(req: WarehouseDispatchRequest, db: Session = Depends(get_db)):
    """Send items from central warehouse to a branch."""
    result = admin_service.warehouse_dispatch(
        db, req.warehouse_item_id, req.to_branch.upper(), req.quantity
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
