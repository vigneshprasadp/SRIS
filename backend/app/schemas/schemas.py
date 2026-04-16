from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import datetime


# ─────────────────────────────────────────────
#  PRODUCT SCHEMAS
# ─────────────────────────────────────────────
VALID_CATEGORIES = {
    "Dairy", "Grocery", "Bakery", "Beverages", "Snacks",
    "Household", "Personal Care", "Clothing", "Electronics",
    "Stationery", "Frozen", "Health", "Baby", "Pet", "Other"
}

class ProductCreate(BaseModel):
    name          : str
    category      : str
    price         : float
    stock         : int
    reorder_level : int
    subcategory   : Optional[str] = None
    brand         : Optional[str] = None
    branch_id     : Optional[str] = "B001"
    expiry_days   : Optional[int] = None
    description   : Optional[str] = None
    unit          : Optional[str] = "unit"

    @field_validator("price")
    @classmethod
    def price_positive(cls, v):
        if v <= 0:
            raise ValueError("price must be greater than 0")
        return v

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("stock cannot be negative")
        return v

    @field_validator("reorder_level")
    @classmethod
    def reorder_positive(cls, v):
        if v <= 0:
            raise ValueError("reorder_level must be greater than 0")
        return v

    @field_validator("category")
    @classmethod
    def category_valid(cls, v):
        if v not in VALID_CATEGORIES:
            raise ValueError(f"category must be one of: {sorted(VALID_CATEGORIES)}")
        return v

class ProductUpdate(BaseModel):
    name          : Optional[str]   = None
    category      : Optional[str]   = None
    subcategory   : Optional[str]   = None
    brand         : Optional[str]   = None
    price         : Optional[float] = None
    reorder_level : Optional[int]   = None
    expiry_days   : Optional[int]   = None
    description   : Optional[str]   = None
    unit          : Optional[str]   = None
    is_active     : Optional[bool]  = None

class ProductStockUpdate(BaseModel):
    stock      : int
    reason     : Optional[str] = None   # "RESTOCK" | "DAMAGE" | "CORRECTION"

    @field_validator("stock")
    @classmethod
    def stock_non_negative(cls, v):
        if v < 0:
            raise ValueError("stock cannot be negative")
        return v

class ProductResponse(BaseModel):
    id            : int
    name          : str
    category      : str
    subcategory   : Optional[str]
    brand         : Optional[str]
    price         : float
    stock         : int
    reorder_level : int
    branch_id     : str
    expiry_days   : Optional[int]
    is_active     : bool
    description   : Optional[str]
    unit          : Optional[str]
    stock_status  : str = "IN_STOCK"
    created_at    : datetime
    updated_at    : datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def compute_stock_status(self):
        if self.stock <= 0:
            self.stock_status = "OUT_OF_STOCK"
        elif self.stock < self.reorder_level:
            self.stock_status = "LOW_STOCK"
        else:
            self.stock_status = "IN_STOCK"
        return self

class ProductListResponse(BaseModel):
    total     : int
    in_stock  : int
    low_stock : int
    critical  : int
    items     : List[ProductResponse]


# ─────────────────────────────────────────────
#  EMPLOYEE SCHEMAS
# ─────────────────────────────────────────────
VALID_ROLES = {
    "Cashier", "Supervisor", "Floor Manager", "Storekeeper",
    "Security Guard", "Billing Manager", "Inventory Manager",
    "Helper", "Cleaning Staff", "Department Head", "Branch Manager"
}

VALID_SHIFTS = {"Morning", "Evening", "Night"}
VALID_ATTENDANCE = {"PRESENT", "ABSENT", "LEAVE"}

class EmployeeCreate(BaseModel):
    name              : str
    role              : str
    salary            : float
    shift             : str
    attendance_status : str
    branch_id         : Optional[str] = "B001"
    phone             : Optional[str] = None
    email             : Optional[str] = None

    @field_validator("salary")
    @classmethod
    def salary_positive(cls, v):
        if v < 0:
            raise ValueError("salary cannot be negative")
        return v

    @field_validator("shift")
    @classmethod
    def shift_valid(cls, v):
        if v not in VALID_SHIFTS:
            raise ValueError(f"shift must be one of: {VALID_SHIFTS}")
        return v

    @field_validator("attendance_status")
    @classmethod
    def attendance_valid(cls, v):
        if v not in VALID_ATTENDANCE:
            raise ValueError(f"attendance_status must be one of: {VALID_ATTENDANCE}")
        return v

class EmployeeUpdate(BaseModel):
    name              : Optional[str]   = None
    role              : Optional[str]   = None
    salary            : Optional[float] = None
    shift             : Optional[str]   = None
    attendance_status : Optional[str]   = None
    phone             : Optional[str]   = None
    email             : Optional[str]   = None
    is_active         : Optional[bool]  = None

class AttendancePatch(BaseModel):
    attendance_status : Literal["PRESENT", "ABSENT", "LEAVE"]

class EmployeeResponse(BaseModel):
    id                : int
    name              : str
    role              : str
    salary            : float
    shift             : str
    attendance_status : str
    branch_id         : str
    phone             : Optional[str]
    email             : Optional[str]
    is_active         : bool
    created_at        : datetime
    updated_at        : datetime

    model_config = ConfigDict(from_attributes=True)

class EmployeeListResponse(BaseModel):
    total   : int
    present : int
    absent  : int
    on_leave: int
    items   : List[EmployeeResponse]


# ─────────────────────────────────────────────
#  ALERT SCHEMAS
# ─────────────────────────────────────────────
class AlertCreate(BaseModel):
    product_id  : Optional[int] = None
    alert_type  : str
    message     : str
    severity    : Optional[str] = "WARNING"
    branch_id   : Optional[str] = "B001"

class AlertResponse(BaseModel):
    id          : int
    product_id  : Optional[int]
    alert_type  : str
    message     : str
    status      : str
    severity    : str
    branch_id   : str
    resolved_at : Optional[datetime]
    created_at  : datetime

    model_config = ConfigDict(from_attributes=True)

class AlertLowStockResponse(BaseModel):
    product_id    : int
    product       : str
    category      : str
    current_stock : int
    required_stock: int
    status        : str   # LOW_STOCK | OUT_OF_STOCK

class AlertListResponse(BaseModel):
    total    : int
    critical : int
    warning  : int
    info     : int
    items    : List[AlertResponse]


# ─────────────────────────────────────────────
#  BRANCH SUMMARY SCHEMAS
# ─────────────────────────────────────────────
class BranchSummaryResponse(BaseModel):
    branch_id       : str
    branch_name     : str
    location        : Optional[str]
    today_revenue   : float
    monthly_revenue : float
    staff_count     : int
    manager_name    : Optional[str]
    updated_at      : Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class BranchSummaryUpdate(BaseModel):
    today_revenue   : Optional[float] = None
    monthly_revenue : Optional[float] = None
    staff_count     : Optional[int]   = None
    manager_name    : Optional[str]   = None


# ─────────────────────────────────────────────
#  GENERIC
# ─────────────────────────────────────────────
class MessageResponse(BaseModel):
    message : str
    detail  : Optional[str] = None
