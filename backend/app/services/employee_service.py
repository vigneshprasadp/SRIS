"""
employee_service.py — Business logic layer for Employees
"""
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.domain import Employee
from app.schemas.schemas import EmployeeCreate, EmployeeUpdate, AttendancePatch


# ─── READ ─────────────────────────────────────────────────────────────────────

def get_all_employees(
    db: Session,
    branch_id: str = "B001",
    search: Optional[str] = None,
    role: Optional[str] = None,
    shift: Optional[str] = None,
    attendance_status: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
) -> dict:
    query = db.query(Employee).filter(
        Employee.branch_id == branch_id,
        Employee.is_active == True,
    )

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(Employee.name.ilike(pattern), Employee.role.ilike(pattern))
        )
    if role:
        query = query.filter(Employee.role == role)
    if shift:
        query = query.filter(Employee.shift == shift)
    if attendance_status:
        query = query.filter(Employee.attendance_status == attendance_status)

    employees = query.offset(skip).limit(limit).all()

    present  = sum(1 for e in employees if e.attendance_status == "PRESENT")
    absent   = sum(1 for e in employees if e.attendance_status == "ABSENT")
    on_leave = sum(1 for e in employees if e.attendance_status == "LEAVE")

    return {
        "total":    len(employees),
        "present":  present,
        "absent":   absent,
        "on_leave": on_leave,
        "items":    employees,
    }


def get_employee_by_id(db: Session, employee_id: int) -> Optional[Employee]:
    return db.query(Employee).filter(Employee.id == employee_id).first()


# ─── CREATE ───────────────────────────────────────────────────────────────────

def create_employee(db: Session, employee: EmployeeCreate) -> Employee:
    db_employee = Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


# ─── UPDATE (patch) ───────────────────────────────────────────────────────────

def update_employee(db: Session, employee_id: int, update_data: EmployeeUpdate) -> Optional[Employee]:
    db_emp = get_employee_by_id(db, employee_id)
    if not db_emp:
        return None

    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(db_emp, field, value)

    db_emp.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_emp)
    return db_emp


# ─── ATTENDANCE PATCH ─────────────────────────────────────────────────────────

def mark_attendance(db: Session, employee_id: int, patch: AttendancePatch) -> Optional[Employee]:
    db_emp = get_employee_by_id(db, employee_id)
    if not db_emp:
        return None
    db_emp.attendance_status = patch.attendance_status
    db_emp.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(db_emp)
    return db_emp


# ─── BULK ATTENDANCE ──────────────────────────────────────────────────────────

def bulk_mark_attendance(
    db: Session,
    branch_id: str,
    new_status: str,
    shift: Optional[str] = None,
) -> int:
    query = db.query(Employee).filter(
        Employee.branch_id == branch_id,
        Employee.is_active == True,
    )
    if shift:
        query = query.filter(Employee.shift == shift)

    employees = query.all()
    for emp in employees:
        emp.attendance_status = new_status
        emp.updated_at = datetime.datetime.utcnow()

    db.commit()
    return len(employees)


# ─── DELETE (soft) ────────────────────────────────────────────────────────────

def delete_employee(db: Session, employee_id: int) -> bool:
    db_emp = get_employee_by_id(db, employee_id)
    if not db_emp:
        return False
    db_emp.is_active = False
    db.commit()
    return True
