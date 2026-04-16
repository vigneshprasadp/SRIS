"""
routes/branch.py
GET    /api/branch/{branch_id}           — branch summary
GET    /api/branch/{branch_id}/stats     — live computed stats
PATCH  /api/branch/{branch_id}           — update summary
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import BranchSummaryResponse, BranchSummaryUpdate
from app.services.branch_service import (
    get_branch_summary, get_branch_live_stats, update_branch_summary,
)

router = APIRouter(prefix="/api/branch", tags=["Branch"])


@router.get("/{branch_id}", response_model=BranchSummaryResponse, summary="Branch summary")
def read_branch(branch_id: str, db: Session = Depends(get_db)):
    summary = get_branch_summary(db, branch_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Branch {branch_id} not found")
    return summary


@router.get("/{branch_id}/stats", summary="Live computed branch stats")
def branch_stats(branch_id: str, db: Session = Depends(get_db)):
    return get_branch_live_stats(db, branch_id)


@router.patch("/{branch_id}", response_model=BranchSummaryResponse, summary="Update branch summary")
def patch_branch(branch_id: str, update_data: BranchSummaryUpdate, db: Session = Depends(get_db)):
    updated = update_branch_summary(db, branch_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Branch {branch_id} not found")
    return updated
