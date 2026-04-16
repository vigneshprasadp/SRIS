"""
seed.py — Populate database with realistic DMart Whitefield data.

Run once: python -m app.utils.seed
"""
import datetime
import random
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.domain import Product, Employee, BranchSummary, Alert

BRANCH_ID = "B001"

# ─── PRODUCTS (50 realistic items across all categories) ─────────────────────
PRODUCTS = [
    # Dairy
    ("Amul Full Cream Milk 1L",       "Dairy",       "Milk",        "Amul",     68,   82, 20, 3,  "L"),
    ("Amul Toned Milk 500ml",         "Dairy",       "Milk",        "Amul",     35,   40, 15, 3,  "L"),
    ("Amul Butter 500g",              "Dairy",       "Butter",      "Amul",     265,  9,  15, 7,  "g"),
    ("Amul Cheese Slices 200g",       "Dairy",       "Cheese",      "Amul",     140,  22, 10, 10, "g"),
    ("Mother Dairy Dahi 500g",        "Dairy",       "Curd",        "M.Dairy",  65,   14, 20, 5,  "g"),
    ("Amul Paneer 200g",              "Dairy",       "Paneer",      "Amul",     90,   30, 15, 5,  "g"),
    # Grocery
    ("Tata Salt 1kg",                 "Grocery",     "Salt",        "Tata",     25,   14, 25, None,"kg"),
    ("Fortune Sunflower Oil 1L",      "Grocery",     "Oil",         "Fortune",  148,  18, 30, None,"L"),
    ("Aashirvaad Atta 5kg",           "Grocery",     "Flour",       "ITC",      295,  35, 20, None,"kg"),
    ("India Gate Basmati Rice 5kg",   "Grocery",     "Rice",        "I.Gate",   499,  28, 15, None,"kg"),
    ("Saffola Gold Oil 1L",           "Grocery",     "Oil",         "Saffola",  178,  50, 20, None,"L"),
    ("Tata Tea Premium 500g",         "Grocery",     "Tea",         "Tata",     225,  45, 15, None,"g"),
    ("Bru Original Coffee 200g",      "Grocery",     "Coffee",      "Bru",      250,  32, 10, None,"g"),
    ("Maggi Masala Noodles 12pk",     "Grocery",     "Noodles",     "Nestle",   180,  60, 20, 180,"pcs"),
    ("MDH Garam Masala 100g",         "Grocery",     "Spices",      "MDH",      85,   55, 20, None,"g"),
    ("Toor Dal 1kg",                  "Grocery",     "Pulses",      "DMart",    130,  40, 20, None,"kg"),
    ("Chana Dal 1kg",                 "Grocery",     "Pulses",      "DMart",    120,  38, 20, None,"kg"),
    # Bakery
    ("Britannia Good Day 200g",       "Bakery",      "Biscuits",    "Brit.",    40,   90, 30, 90, "g"),
    ("Parle-G 800g",                  "Bakery",      "Biscuits",    "Parle",    82,   120, 40, 90,"g"),
    ("Britannia Brown Bread",         "Bakery",      "Bread",       "Brit.",    45,   6,  20, 4,  "pcs"),
    ("Modern White Bread",            "Bakery",      "Bread",       "Modern",   38,   8,  20, 4,  "pcs"),
    # Beverages
    ("Tropicana Orange 1L",           "Beverages",   "Juice",       "PepsiCo", 110,  48, 15, 30, "L"),
    ("Real Mixed Fruit 1L",           "Beverages",   "Juice",       "Dabur",   105,  35, 15, 30, "L"),
    ("Bisleri Water 2L (6pk)",        "Beverages",   "Water",       "Bisleri",  120, 100, 30, None,"pcs"),
    ("Red Bull 250ml",                "Beverages",   "Energy",      "RedBull",  115,  44, 15, 180,"ml"),
    # Snacks
    ("Lay's Classic Salted 100g",     "Snacks",      "Chips",       "PepsiCo",  30,  80, 30, 180,"g"),
    ("Kurkure Masala Munch 90g",      "Snacks",      "Puffed",      "PepsiCo",  20,  75, 30, 180,"g"),
    ("Haldiram's Aloo Bhujia 400g",   "Snacks",      "Namkeen",     "Haldram",  120,  50, 20, 90,"g"),
    ("Cadbury Dairy Milk 160g",       "Snacks",      "Chocolate",   "Mondelez", 100,  45, 15, 180,"g"),
    # Household
    ("Surf Excel Matic 1kg",          "Household",   "Detergent",   "HUL",      190,  3,  15, None,"kg"),
    ("Ariel Matic 2kg",               "Household",   "Detergent",   "P&G",      360,  22, 10, None,"kg"),
    ("Lux Soap 3pk",                  "Household",   "Soap",        "HUL",       90,   0,  20, None,"pcs"),
    ("Dettol Handwash 200ml",         "Household",   "Hygiene",     "Reckitt",  85,   40, 20, None,"ml"),
    ("Harpic Toilet Cleaner 1L",      "Household",   "Cleaner",     "Reckitt",  150,  28, 15, None,"L"),
    ("Vim Dishwash Bar 6pk",          "Household",   "Dishwash",    "HUL",       75,   60, 20, None,"pcs"),
    ("Colin Glass Cleaner 500ml",     "Household",   "Cleaner",     "Reckitt",  110,  35, 15, None,"ml"),
    # Personal Care
    ("Colgate MaxFresh 300g",         "Personal Care","Toothpaste",  "Colgate",  130,  70, 20, None,"g"),
    ("Pantene Shampoo 340ml",         "Personal Care","Shampoo",     "P&G",      245,  38, 15, None,"ml"),
    ("Dove Shampoo 340ml",            "Personal Care","Shampoo",     "HUL",      255,  42, 15, None,"ml"),
    ("Gillette Mach3 Razor",          "Personal Care","Razor",       "P&G",      249,  25, 10, None,"pcs"),
    ("Nivea Body Lotion 400ml",       "Personal Care","Lotion",      "Nivea",    280,  30, 10, None,"ml"),
    # Clothing
    ("Cotton T-Shirt Men M",          "Clothing",    "Men T-Shirt", "DMart",    249,  60, 20, None,"pcs"),
    ("Women Kurti XL",                "Clothing",    "Women Kurti", "DMart",    399,  22, 10, None,"pcs"),
    ("Kids Shorts 4-5yr",             "Clothing",    "Kids",        "DMart",    199,  35, 15, None,"pcs"),
    ("Men Formal Trousers 32",        "Clothing",    "Men Trousers","DMart",    699,  18, 10, None,"pcs"),
    ("Cotton Bed Sheet Double",       "Clothing",    "Bedsheet",    "DMart",    599,  25, 10, None,"pcs"),
    # Health
    ("Dettol Antiseptic 250ml",       "Health",      "Antiseptic",  "Reckitt",  150,  55, 15, None,"ml"),
    ("Revital H 30-cap",              "Health",      "Vitamins",    "Revital",  275,  20, 8,  None,"pcs"),
    # Frozen
    ("McCain Smiles 400g",            "Frozen",      "Frozen Veg",  "McCain",   170,  18, 10, 30, "g"),
    ("Amul Ice Cream Vanilla 500ml",  "Frozen",      "Ice Cream",   "Amul",     180,  12, 8,  10, "ml"),
]

# ─── EMPLOYEES (30 staff members) ────────────────────────────────────────────
FIRST_NAMES = ["Priya","Rahul","Anita","Vikram","Sunita","Mohan","Kavya","Deepak",
                "Ritu","Arjun","Meena","Sanjay","Pooja","Dinesh","Lakshmi","Suresh",
                "Divya","Ramesh","Geeta","Anil","Neha","Kartik","Shobha","Venkat",
                "Pallavi","Krishna","Savitha","Rajesh","Usha","Ashok"]
LAST_NAMES  = ["Sharma","Mehta","Kumar","Das","Rao","Lal","Iyer","Singh",
                "Verma","Nair","Pillai","Gupta","Reddy","Joshi","Chandra","Agarwal",
                "Naidu","Patel","Khanna","Bhat","Hegde","Shetty","Pandey","Tiwari",
                "Desai","Shah","Mishra","Chopra","Kapoor","Saxena"]
ROLES       = [
    "Cashier","Cashier","Cashier","Cashier","Cashier",
    "Supervisor","Supervisor",
    "Floor Manager","Floor Manager",
    "Storekeeper","Storekeeper","Storekeeper",
    "Security Guard","Security Guard","Security Guard",
    "Billing Manager","Inventory Manager",
    "Helper","Helper","Helper","Helper",
    "Cleaning Staff","Cleaning Staff",
    "Department Head","Department Head",
]
SHIFTS = ["Morning","Morning","Morning","Evening","Evening","Night"]
ROLE_SALARY = {
    "Cashier": 18000, "Supervisor": 28000, "Floor Manager": 32000,
    "Storekeeper": 16000, "Security Guard": 15000, "Billing Manager": 25000,
    "Inventory Manager": 27000, "Helper": 12000,
    "Cleaning Staff": 11000, "Department Head": 40000,
}


def seed(db: Session):
    # Branch Summary
    if not db.query(BranchSummary).filter(BranchSummary.branch_id == BRANCH_ID).first():
        db.add(BranchSummary(
            branch_id=BRANCH_ID,
            branch_name="DMart Whitefield",
            location="Whitefield Main Road, Bengaluru – 560066",
            today_revenue=84500.0,
            monthly_revenue=2650000.0,
            staff_count=30,
            manager_name="Anjali Menon",
            open_since=datetime.datetime(2018, 3, 15),
        ))

    # Products
    if db.query(Product).count() == 0:
        for row in PRODUCTS:
            name, cat, subcat, brand, price, stock, reorder, expiry, unit = row
            db.add(Product(
                name=name, category=cat, subcategory=subcat, brand=brand,
                price=price, stock=stock, reorder_level=reorder,
                expiry_days=expiry, unit=unit,
                branch_id=BRANCH_ID, is_active=True,
            ))

    # Employees
    if db.query(Employee).count() == 0:
        random.seed(42)
        for i in range(30):
            role  = ROLES[i % len(ROLES)]
            shift = SHIFTS[i % len(SHIFTS)]
            status = "PRESENT" if random.random() > 0.15 else random.choice(["ABSENT","LEAVE"])
            db.add(Employee(
                name=f"{FIRST_NAMES[i]} {LAST_NAMES[i]}",
                role=role, salary=ROLE_SALARY.get(role, 16000),
                shift=shift, attendance_status=status,
                branch_id=BRANCH_ID, is_active=True,
                join_date=datetime.datetime(2020, 1, 1) + datetime.timedelta(days=random.randint(0, 1000)),
            ))

    db.commit()

    # Auto-generate low-stock alerts post-seed
    products = db.query(Product).filter(
        Product.branch_id == BRANCH_ID,
        Product.stock < Product.reorder_level,
    ).all()
    for prod in products:
        exists = db.query(Alert).filter(
            Alert.product_id == prod.id, Alert.status == "ACTIVE"
        ).first()
        if not exists:
            severity = "CRITICAL" if prod.stock <= 0 else "WARNING"
            atype    = "OUT_OF_STOCK" if prod.stock <= 0 else "LOW_STOCK"
            db.add(Alert(
                product_id=prod.id, alert_type=atype,
                message=(
                    f"{'Out of stock' if prod.stock <= 0 else 'Low stock'}: {prod.name}. "
                    f"Current: {prod.stock}, Reorder: {prod.reorder_level}."
                ),
                severity=severity, branch_id=BRANCH_ID,
            ))

    # Add some expiry alerts for perishables
    perishables = db.query(Product).filter(
        Product.branch_id == BRANCH_ID, Product.expiry_days != None, Product.expiry_days <= 5
    ).all()
    for prod in perishables[:3]:
        db.add(Alert(
            product_id=prod.id, alert_type="EXPIRY_ALERT",
            message=f"Expiry alert: {prod.name} expires in {prod.expiry_days} day(s). Consider immediate action.",
            severity="CRITICAL", branch_id=BRANCH_ID,
        ))

    db.commit()
    print(f"[SEED] Done: {len(PRODUCTS)} products, 30 employees, alerts inserted.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
