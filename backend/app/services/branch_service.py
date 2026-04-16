"""
branch_service.py — Business logic for Branch Summary
"""
import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models.domain import BranchSummary, Product, Employee
from app.schemas.schemas import BranchSummaryUpdate


def get_branch_summary(db: Session, branch_id: str = "B001") -> Optional[BranchSummary]:
    summary = db.query(BranchSummary).filter(BranchSummary.branch_id == branch_id).first()
    if not summary:
        # Create default if not exists
        summary = BranchSummary(
            branch_id=branch_id,
            branch_name="DMart Whitefield",
            location="Whitefield, Bengaluru",
            today_revenue=84500.0,
            monthly_revenue=2650000.0,
            staff_count=0,
            manager_name="Branch Manager",
            open_since=datetime.datetime(2018, 3, 15),
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)
    return summary


def get_branch_live_stats(db: Session, branch_id: str = "B001") -> dict:
    """Compute live stats from actual DB rows."""
    product_count   = db.query(Product).filter(
        Product.branch_id == branch_id, Product.is_active == True).count()
    low_stock_count = db.query(Product).filter(
        Product.branch_id == branch_id, Product.is_active == True,
        Product.stock < Product.reorder_level).count()
    out_of_stock    = db.query(Product).filter(
        Product.branch_id == branch_id, Product.is_active == True,
        Product.stock == 0).count()
    staff_present   = db.query(Employee).filter(
        Employee.branch_id == branch_id, Employee.is_active == True,
        Employee.attendance_status == "PRESENT").count()
    staff_total     = db.query(Employee).filter(
        Employee.branch_id == branch_id, Employee.is_active == True).count()

    summary = get_branch_summary(db, branch_id)

    return {
        "branch_id":       branch_id,
        "branch_name":     summary.branch_name,
        "location":        summary.location,
        "manager_name":    summary.manager_name,
        "today_revenue":   summary.today_revenue,
        "monthly_revenue": summary.monthly_revenue,
        "product_count":   product_count,
        "low_stock_count": low_stock_count,
        "out_of_stock":    out_of_stock,
        "staff_present":   staff_present,
        "staff_total":     staff_total,
    }


def update_branch_summary(
    db: Session, branch_id: str, update_data: BranchSummaryUpdate
) -> Optional[BranchSummary]:
    summary = get_branch_summary(db, branch_id)
    if not summary:
        return None
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(summary, field, value)
    summary.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(summary)
    return summary
