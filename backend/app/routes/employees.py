"""
routes/employees.py
GET    /api/employees                        — list with filters + summary
GET    /api/employees/{id}                   — single employee
POST   /api/employees                        — add employee
PATCH  /api/employees/{id}                   — update employee details
PATCH  /api/employees/{id}/attendance        — mark attendance
POST   /api/employees/bulk-attendance        — mark attendance for whole shift
DELETE /api/employees/{id}                   — soft-delete
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.schemas.schemas import (
    EmployeeResponse, EmployeeCreate, EmployeeUpdate,
    AttendancePatch, EmployeeListResponse, MessageResponse,
)
from app.services.employee_service import (
    get_all_employees, get_employee_by_id,
    create_employee, update_employee, mark_attendance,
    bulk_mark_attendance, delete_employee,
)

router = APIRouter(prefix="/api/employees", tags=["Employees"])


# ── LIST ──────────────────────────────────────────────────────────────────────
@router.get("", response_model=EmployeeListResponse, summary="Get all employees with summary")
def read_employees(
    branch_id         : str            = Query("B001"),
    search            : Optional[str] = Query(None),
    role              : Optional[str] = Query(None),
    shift             : Optional[str] = Query(None),
    attendance_status : Optional[str] = Query(None),
    skip              : int           = Query(0, ge=0),
    limit             : int           = Query(500, ge=1, le=1000),
    db                : Session       = Depends(get_db),
):
    return get_all_employees(db, branch_id, search, role, shift, attendance_status, skip, limit)


# ── SINGLE ────────────────────────────────────────────────────────────────────
@router.get("/{employee_id}", response_model=EmployeeResponse, summary="Get employee by ID")
def read_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = get_employee_by_id(db, employee_id)
    if not emp or not emp.is_active:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return emp


# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", response_model=EmployeeResponse, status_code=201, summary="Add a new employee")
def add_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    return create_employee(db, employee)


# ── PATCH (details) ───────────────────────────────────────────────────────────
@router.patch("/{employee_id}", response_model=EmployeeResponse, summary="Update employee details")
def patch_employee(
    employee_id : int,
    update_data : EmployeeUpdate,
    db          : Session = Depends(get_db),
):
    updated = update_employee(db, employee_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return updated


# ── ATTENDANCE ────────────────────────────────────────────────────────────────
@router.patch(
    "/{employee_id}/attendance",
    response_model=EmployeeResponse,
    summary="Mark attendance for single employee",
)
def patch_attendance(
    employee_id : int,
    patch       : AttendancePatch,
    db          : Session = Depends(get_db),
):
    updated = mark_attendance(db, employee_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return updated


# ── BULK ATTENDANCE ───────────────────────────────────────────────────────────
@router.post("/bulk-attendance", response_model=MessageResponse, summary="Bulk mark attendance for shift")
def bulk_attendance(
    status    : str            = Query(..., description="PRESENT | ABSENT | LEAVE"),
    shift     : Optional[str] = Query(None, description="Morning | Evening | Night (optional filter)"),
    branch_id : str           = Query("B001"),
    db        : Session       = Depends(get_db),
):
    count = bulk_mark_attendance(db, branch_id, status, shift)
    return {
        "message": f"Attendance marked as {status} for {count} employees.",
        "detail": f"Shift filter: {shift or 'All shifts'}",
    }


# ── DELETE (soft) ─────────────────────────────────────────────────────────────
@router.delete("/{employee_id}", response_model=MessageResponse, summary="Soft-delete employee")
def remove_employee(employee_id: int, db: Session = Depends(get_db)):
    success = delete_employee(db, employee_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Employee {employee_id} not found")
    return {"message": f"Employee {employee_id} deactivated successfully."}
