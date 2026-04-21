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

class BranchStatus(str, enum.Enum):
    ACTIVE   = "ACTIVE"
    INACTIVE = "INACTIVE"
    RENOVATING = "RENOVATING"

class TransferStatus(str, enum.Enum):
    PENDING   = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class UserRole(str, enum.Enum):
    ADMIN          = "ADMIN"
    BRANCH_MANAGER = "BRANCH_MANAGER"
    CASHIER        = "CASHIER"

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
    unit           = Column(String(50), nullable=True, default="unit")  # kg, L, pcs ...
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.datetime.utcnow,
                            onupdate=datetime.datetime.utcnow)

    # relationships
    alerts     = relationship("Alert", back_populates="product",
                              cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")

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


# ─────────────────────────────────────────────
#  SALE TRANSACTION  (one row = one completed bill)
# ─────────────────────────────────────────────
class SaleTransaction(Base):
    __tablename__ = "sales_transactions"

    id             = Column(Integer, primary_key=True, index=True)
    branch_id      = Column(String(20), nullable=False, default="B001", index=True)
    cashier_id     = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"),
                            nullable=True, index=True)
    invoice_number = Column(String(50), nullable=False, unique=True, index=True)
    total_amount   = Column(Float, nullable=False)
    payment_mode   = Column(String(20), nullable=False, default="Cash")  # Cash|Card|UPI|Wallet
    sale_date      = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)

    # relationships
    cashier  = relationship("Employee")
    items    = relationship("SaleItem", back_populates="transaction",
                            cascade="all, delete-orphan")
    pay_log  = relationship("PaymentLog", back_populates="transaction",
                             uselist=False, cascade="all, delete-orphan")


# ─────────────────────────────────────────────
#  SALE ITEM  (products inside a bill)
# ─────────────────────────────────────────────
class SaleItem(Base):
    __tablename__ = "sale_items"

    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("sales_transactions.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    product_id     = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"),
                            nullable=True, index=True)
    quantity       = Column(Integer, nullable=False)
    unit_price     = Column(Float, nullable=False)
    subtotal       = Column(Float, nullable=False)

    # relationships
    transaction = relationship("SaleTransaction", back_populates="items")
    product     = relationship("Product", back_populates="sale_items")


# ─────────────────────────────────────────────
#  BRANCH REVENUE  (daily aggregated revenue per branch)
# ─────────────────────────────────────────────
class BranchRevenue(Base):
    __tablename__ = "branch_revenue"

    id            = Column(Integer, primary_key=True, index=True)
    branch_id     = Column(String(20), nullable=False, default="B001", index=True)
    date          = Column(String(10), nullable=False, index=True)  # "YYYY-MM-DD"
    daily_revenue = Column(Float, default=0.0)
    daily_orders  = Column(Integer, default=0)


# ─────────────────────────────────────────────
#  PAYMENT LOG
# ─────────────────────────────────────────────
class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id             = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("sales_transactions.id", ondelete="CASCADE"),
                            nullable=False, unique=True, index=True)
    payment_status = Column(String(20), nullable=False, default="SUCCESS")  # SUCCESS|FAILED|PENDING
    payment_mode   = Column(String(20), nullable=False, default="Cash")
    timestamp      = Column(DateTime, default=datetime.datetime.utcnow)

    # relationships
    transaction = relationship("SaleTransaction", back_populates="pay_log")


# ─────────────────────────────────────────────
#  PHASE 4 — ENTERPRISE MODELS
# ─────────────────────────────────────────────

class Branch(Base):
    """Enterprise-wide branch registry (Phase 4)."""
    __tablename__ = "branches"

    id           = Column(Integer, primary_key=True, index=True)
    branch_code  = Column(String(20), nullable=False, unique=True, index=True)  # e.g. B001
    name         = Column(String(200), nullable=False)
    location     = Column(String(300), nullable=True)
    manager_id   = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    opening_date = Column(DateTime, nullable=True)
    status       = Column(String(20), nullable=False, default="ACTIVE")  # ACTIVE|INACTIVE|RENOVATING
    city         = Column(String(100), nullable=True)
    pincode      = Column(String(10), nullable=True)
    phone        = Column(String(20), nullable=True)
    created_at   = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.datetime.utcnow,
                          onupdate=datetime.datetime.utcnow)

    manager = relationship("Employee", foreign_keys=[manager_id])


class Warehouse(Base):
    """Central warehouse inventory (Phase 4)."""
    __tablename__ = "warehouse"

    id             = Column(Integer, primary_key=True, index=True)
    product_name   = Column(String(200), nullable=False, index=True)
    category       = Column(String(100), nullable=True)
    total_stock    = Column(Integer, nullable=False, default=0)
    incoming_stock = Column(Integer, nullable=False, default=0)
    outgoing_stock = Column(Integer, nullable=False, default=0)
    supplier       = Column(String(200), nullable=True)
    unit           = Column(String(50), nullable=True, default="unit")
    reorder_level  = Column(Integer, nullable=False, default=100)
    last_restocked = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.datetime.utcnow,
                            onupdate=datetime.datetime.utcnow)


class StockTransfer(Base):
    """Cross-branch stock movement log (Phase 4)."""
    __tablename__ = "stock_transfers"

    id          = Column(Integer, primary_key=True, index=True)
    from_branch = Column(String(20), nullable=False, index=True)  # branch_code
    to_branch   = Column(String(20), nullable=False, index=True)
    product_id  = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    quantity    = Column(Integer, nullable=False)
    status      = Column(String(20), nullable=False, default="COMPLETED")  # PENDING|COMPLETED|CANCELLED
    notes       = Column(Text, nullable=True)
    date        = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    created_at  = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product")


class BranchMetrics(Base):
    """Aggregated KPIs per branch (Phase 4 — updated periodically)."""
    __tablename__ = "branch_metrics"

    id                = Column(Integer, primary_key=True, index=True)
    branch_id         = Column(String(20), nullable=False, unique=True, index=True)
    total_revenue     = Column(Float, default=0.0)
    monthly_revenue   = Column(Float, default=0.0)
    total_orders      = Column(Integer, default=0)
    avg_order_value   = Column(Float, default=0.0)
    stock_health_score= Column(Float, default=0.0)   # 0-100
    low_stock_items   = Column(Integer, default=0)
    staff_count       = Column(Integer, default=0)
    last_updated      = Column(DateTime, default=datetime.datetime.utcnow,
                               onupdate=datetime.datetime.utcnow)
