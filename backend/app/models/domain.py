from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum
)
from sqlalchemy.orm import relationship
import datetime
import enum
from app.database import Base


# ─────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────
class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT  = "ABSENT"
    LEAVE   = "LEAVE"

class ShiftType(str, enum.Enum):
    MORNING = "Morning"
    EVENING = "Evening"
    NIGHT   = "Night"

class AlertType(str, enum.Enum):
    LOW_STOCK    = "LOW_STOCK"
    DAMAGED_ITEM = "DAMAGED_ITEM"
    EXPIRY_ALERT = "EXPIRY_ALERT"
    OUT_OF_STOCK = "OUT_OF_STOCK"

class AlertStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    RESOLVED = "RESOLVED"


# ─────────────────────────────────────────────
#  PRODUCT
# ─────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(200), nullable=False, index=True)
    category       = Column(String(100), nullable=False, index=True)
    subcategory    = Column(String(100), nullable=True)
    brand          = Column(String(100), nullable=True)
    price          = Column(Float, nullable=False)
    stock          = Column(Integer, nullable=False, default=0)
    reorder_level  = Column(Integer, nullable=False, default=10)
    branch_id      = Column(String(20), nullable=False, default="B001", index=True)
    expiry_days    = Column(Integer, nullable=True)   # None = non-perishable
    is_active      = Column(Boolean, default=True)
    description    = Column(Text, nullable=True)
    unit           = Column(String(50), nullable=True, default="unit")  # kg, L, pcs …
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.datetime.utcnow,
                            onupdate=datetime.datetime.utcnow)

    # relationships
    alerts = relationship("Alert", back_populates="product",
                          cascade="all, delete-orphan")

    @property
    def stock_status(self) -> str:
        if self.stock <= 0:
            return "OUT_OF_STOCK"
        if self.stock < self.reorder_level:
            return "LOW_STOCK"
        return "IN_STOCK"


# ─────────────────────────────────────────────
#  EMPLOYEE
# ─────────────────────────────────────────────
class Employee(Base):
    __tablename__ = "employees"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String(150), nullable=False, index=True)
    role              = Column(String(100), nullable=False)
    salary            = Column(Float, nullable=False, default=0.0)
    shift             = Column(String(20), nullable=False, default="Morning")
    attendance_status = Column(String(20), nullable=False, default="PRESENT")
    branch_id         = Column(String(20), nullable=False, default="B001", index=True)
    phone             = Column(String(20), nullable=True)
    email             = Column(String(150), nullable=True)
    join_date         = Column(DateTime, nullable=True, default=datetime.datetime.utcnow)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.datetime.utcnow,
                               onupdate=datetime.datetime.utcnow)


# ─────────────────────────────────────────────
#  BRANCH SUMMARY
# ─────────────────────────────────────────────
class BranchSummary(Base):
    __tablename__ = "branch_summary"

    branch_id       = Column(String(20), primary_key=True, index=True)
    branch_name     = Column(String(200), nullable=False)
    location        = Column(String(200), nullable=True)
    today_revenue   = Column(Float, default=0.0)
    monthly_revenue = Column(Float, default=0.0)
    staff_count     = Column(Integer, default=0)
    manager_name    = Column(String(150), nullable=True)
    open_since      = Column(DateTime, nullable=True)
    updated_at      = Column(DateTime, default=datetime.datetime.utcnow,
                             onupdate=datetime.datetime.utcnow)


# ─────────────────────────────────────────────
#  ALERT
# ─────────────────────────────────────────────
class Alert(Base):
    __tablename__ = "alerts"

    id          = Column(Integer, primary_key=True, index=True)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"),
                         nullable=True, index=True)
    alert_type  = Column(String(50), nullable=False)   # see AlertType enum
    message     = Column(Text, nullable=False)
    status      = Column(String(20), nullable=False, default="ACTIVE")
    severity    = Column(String(20), nullable=False, default="WARNING")  # CRITICAL / WARNING / INFO
    branch_id   = Column(String(20), nullable=False, default="B001")
    resolved_at = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)

    # relationships
    product = relationship("Product", back_populates="alerts")
