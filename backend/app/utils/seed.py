"""
seed.py — Populate database with realistic DMart Whitefield data.

Phase 3 upgrade:
  • 50 products (same catalogue)
  • 30 employees
  • 180 days of sale history (6 months)
    – 20-55 transactions / day
    – weekend 30 % busier
    – festival days 60 % busier
    – category-specific purchase frequencies
  This gives ~54 000 sale_item rows — excellent ML training volume.
"""
import datetime
import random
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.domain import (
    Product, Employee, BranchSummary, Alert,
    SaleTransaction, SaleItem, BranchRevenue, PaymentLog,
)

BRANCH_ID = "B001"

# ─── PRODUCTS (50 realistic items) ───────────────────────────────────────────
PRODUCTS = [
    # Dairy
    ("Amul Full Cream Milk 1L",       "Dairy",        "Milk",         "Amul",    68,   82, 20, 3,   "L"),
    ("Amul Toned Milk 500ml",         "Dairy",        "Milk",         "Amul",    35,   40, 15, 3,   "L"),
    ("Amul Butter 500g",              "Dairy",        "Butter",       "Amul",    265,  9,  15, 7,   "g"),
    ("Amul Cheese Slices 200g",       "Dairy",        "Cheese",       "Amul",    140,  22, 10, 10,  "g"),
    ("Mother Dairy Dahi 500g",        "Dairy",        "Curd",         "M.Dairy", 65,   14, 20, 5,   "g"),
    ("Amul Paneer 200g",              "Dairy",        "Paneer",       "Amul",    90,   30, 15, 5,   "g"),
    # Grocery
    ("Tata Salt 1kg",                 "Grocery",      "Salt",         "Tata",    25,   14, 25, None,"kg"),
    ("Fortune Sunflower Oil 1L",      "Grocery",      "Oil",          "Fortune", 148,  18, 30, None,"L"),
    ("Aashirvaad Atta 5kg",           "Grocery",      "Flour",        "ITC",     295,  35, 20, None,"kg"),
    ("India Gate Basmati Rice 5kg",   "Grocery",      "Rice",         "I.Gate",  499,  28, 15, None,"kg"),
    ("Saffola Gold Oil 1L",           "Grocery",      "Oil",          "Saffola", 178,  50, 20, None,"L"),
    ("Tata Tea Premium 500g",         "Grocery",      "Tea",          "Tata",    225,  45, 15, None,"g"),
    ("Bru Original Coffee 200g",      "Grocery",      "Coffee",       "Bru",     250,  32, 10, None,"g"),
    ("Maggi Masala Noodles 12pk",     "Grocery",      "Noodles",      "Nestle",  180,  60, 20, 180, "pcs"),
    ("MDH Garam Masala 100g",         "Grocery",      "Spices",       "MDH",     85,   55, 20, None,"g"),
    ("Toor Dal 1kg",                  "Grocery",      "Pulses",       "DMart",   130,  40, 20, None,"kg"),
    ("Chana Dal 1kg",                 "Grocery",      "Pulses",       "DMart",   120,  38, 20, None,"kg"),
    # Bakery
    ("Britannia Good Day 200g",       "Bakery",       "Biscuits",     "Brit.",   40,   90, 30, 90,  "g"),
    ("Parle-G 800g",                  "Bakery",       "Biscuits",     "Parle",   82,  120, 40, 90,  "g"),
    ("Britannia Brown Bread",         "Bakery",       "Bread",        "Brit.",   45,    6, 20, 4,   "pcs"),
    ("Modern White Bread",            "Bakery",       "Bread",        "Modern",  38,    8, 20, 4,   "pcs"),
    # Beverages
    ("Tropicana Orange 1L",           "Beverages",    "Juice",        "PepsiCo", 110,  48, 15, 30,  "L"),
    ("Real Mixed Fruit 1L",           "Beverages",    "Juice",        "Dabur",   105,  35, 15, 30,  "L"),
    ("Bisleri Water 2L (6pk)",        "Beverages",    "Water",        "Bisleri", 120, 100, 30, None,"pcs"),
    ("Red Bull 250ml",                "Beverages",    "Energy",       "RedBull", 115,  44, 15, 180, "ml"),
    # Snacks
    ("Lay's Classic Salted 100g",     "Snacks",       "Chips",        "PepsiCo", 30,   80, 30, 180, "g"),
    ("Kurkure Masala Munch 90g",      "Snacks",       "Puffed",       "PepsiCo", 20,   75, 30, 180, "g"),
    ("Haldiram's Aloo Bhujia 400g",   "Snacks",       "Namkeen",      "Haldram", 120,  50, 20, 90,  "g"),
    ("Cadbury Dairy Milk 160g",       "Snacks",       "Chocolate",    "Mondelez",100,  45, 15, 180, "g"),
    # Household
    ("Surf Excel Matic 1kg",          "Household",    "Detergent",    "HUL",     190,   3, 15, None,"kg"),
    ("Ariel Matic 2kg",               "Household",    "Detergent",    "P&G",     360,  22, 10, None,"kg"),
    ("Lux Soap 3pk",                  "Household",    "Soap",         "HUL",     90,    0, 20, None,"pcs"),
    ("Dettol Handwash 200ml",         "Household",    "Hygiene",      "Reckitt", 85,   40, 20, None,"ml"),
    ("Harpic Toilet Cleaner 1L",      "Household",    "Cleaner",      "Reckitt", 150,  28, 15, None,"L"),
    ("Vim Dishwash Bar 6pk",          "Household",    "Dishwash",     "HUL",     75,   60, 20, None,"pcs"),
    ("Colin Glass Cleaner 500ml",     "Household",    "Cleaner",      "Reckitt", 110,  35, 15, None,"ml"),
    # Personal Care
    ("Colgate MaxFresh 300g",         "Personal Care","Toothpaste",   "Colgate", 130,  70, 20, None,"g"),
    ("Pantene Shampoo 340ml",         "Personal Care","Shampoo",      "P&G",     245,  38, 15, None,"ml"),
    ("Dove Shampoo 340ml",            "Personal Care","Shampoo",      "HUL",     255,  42, 15, None,"ml"),
    ("Gillette Mach3 Razor",          "Personal Care","Razor",        "P&G",     249,  25, 10, None,"pcs"),
    ("Nivea Body Lotion 400ml",       "Personal Care","Lotion",       "Nivea",   280,  30, 10, None,"ml"),
    # Clothing
    ("Cotton T-Shirt Men M",          "Clothing",     "Men T-Shirt",  "DMart",   249,  60, 20, None,"pcs"),
    ("Women Kurti XL",                "Clothing",     "Women Kurti",  "DMart",   399,  22, 10, None,"pcs"),
    ("Kids Shorts 4-5yr",             "Clothing",     "Kids",         "DMart",   199,  35, 15, None,"pcs"),
    ("Men Formal Trousers 32",        "Clothing",     "Men Trousers", "DMart",   699,  18, 10, None,"pcs"),
    ("Cotton Bed Sheet Double",       "Clothing",     "Bedsheet",     "DMart",   599,  25, 10, None,"pcs"),
    # Health
    ("Dettol Antiseptic 250ml",       "Health",       "Antiseptic",   "Reckitt", 150,  55, 15, None,"ml"),
    ("Revital H 30-cap",              "Health",       "Vitamins",     "Revital", 275,  20,  8, None,"pcs"),
    # Frozen
    ("McCain Smiles 400g",            "Frozen",       "Frozen Veg",   "McCain",  170,  18, 10, 30,  "g"),
    ("Amul Ice Cream Vanilla 500ml",  "Frozen",       "Ice Cream",    "Amul",    180,  12,  8, 10,  "ml"),
]

# ─── EMPLOYEES (30 staff members) ─────────────────────────────────────────────
FIRST_NAMES = ["Priya","Rahul","Anita","Vikram","Sunita","Mohan","Kavya","Deepak",
                "Ritu","Arjun","Meena","Sanjay","Pooja","Dinesh","Lakshmi","Suresh",
                "Divya","Ramesh","Geeta","Anil","Neha","Kartik","Shobha","Venkat",
                "Pallavi","Krishna","Savitha","Rajesh","Usha","Ashok"]
LAST_NAMES  = ["Sharma","Mehta","Kumar","Das","Rao","Lal","Iyer","Singh",
                "Verma","Nair","Pillai","Gupta","Reddy","Joshi","Chandra","Agarwal",
                "Naidu","Patel","Khanna","Bhat","Hegde","Shetty","Pandey","Tiwari",
                "Desai","Shah","Mishra","Chopra","Kapoor","Saxena"]
ROLES = [
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
PAYMENT_MODES = ["Cash","Cash","UPI","UPI","Card","Wallet"]

# ─── Category-purchase weight tables ────────────────────────────────────────
# How many times a day (on average) each category item appears in a cart
CATEGORY_FREQ = {
    "Dairy":        {"base": 0.55, "weekend": 1.25, "festival": 1.40},
    "Grocery":      {"base": 0.50, "weekend": 1.20, "festival": 1.35},
    "Bakery":       {"base": 0.45, "weekend": 1.35, "festival": 1.30},
    "Beverages":    {"base": 0.38, "weekend": 1.45, "festival": 1.50},
    "Snacks":       {"base": 0.42, "weekend": 1.55, "festival": 1.60},
    "Household":    {"base": 0.25, "weekend": 1.10, "festival": 1.15},
    "Personal Care":{"base": 0.28, "weekend": 1.12, "festival": 1.20},
    "Clothing":     {"base": 0.18, "weekend": 1.80, "festival": 2.00},
    "Health":       {"base": 0.20, "weekend": 1.05, "festival": 1.10},
    "Frozen":       {"base": 0.30, "weekend": 1.60, "festival": 1.70},
}

FESTIVAL_DATES = {
    "2024-08-15","2024-10-02","2024-10-12","2024-10-24",
    "2024-11-01","2024-11-02","2024-11-03","2024-11-15",
    "2024-12-25","2024-12-31",
    "2025-01-01","2025-01-14","2025-01-26",
    "2025-03-15","2025-04-14",
    "2025-10-02","2025-11-01","2025-12-25",
    "2026-01-01","2026-01-14","2026-01-26",
    "2026-03-25","2026-04-14",
}


def _seed_sales(db: Session):
    """Seed 180 days of realistic sales history for ML training."""
    if db.query(SaleTransaction).count() > 0:
        print("[SEED] Sales already present — skipping.")
        return

    products = db.query(Product).filter(Product.branch_id == BRANCH_ID).all()
    if not products:
        return

    cashiers = db.query(Employee).filter(
        Employee.branch_id == BRANCH_ID,
        Employee.role == "Cashier",
    ).all()
    if not cashiers:
        return

    random.seed(99)
    now = datetime.datetime.utcnow()

    # 180 days spanning from ~6 months ago to yesterday
    for day_offset in range(180, 0, -1):
        d = now - datetime.timedelta(days=day_offset)
        date_str_key = d.strftime("%Y-%m-%d")
        weekday = d.weekday()            # 0=Mon … 6=Sun
        is_weekend  = weekday >= 5
        is_festival = date_str_key in FESTIVAL_DATES

        # Base transactions per day
        if is_festival:
            n_sales = random.randint(55, 80)
        elif is_weekend:
            n_sales = random.randint(38, 60)
        else:
            n_sales = random.randint(22, 40)

        daily_rev = 0.0

        for i in range(n_sales):
            hour    = random.choice([9,10,10,11,11,12,13,14,15,15,16,17,17,18,18,19,20])
            minute  = random.randint(0, 59)
            sale_dt = d.replace(hour=hour, minute=minute, second=0, microsecond=0)

            cashier  = random.choice(cashiers)
            pay_mode = random.choice(PAYMENT_MODES)
            date_str = d.strftime("%Y%m%d")
            seq      = str(i + 1).zfill(4)
            inv_no   = f"INV-B001-{date_str}-{seq}"

            # Weighted product selection: each category has its own freq
            chosen_products = []
            for prod in products:
                freq_info = CATEGORY_FREQ.get(prod.category, {"base": 0.3, "weekend": 1.0, "festival": 1.0})
                prob = freq_info["base"]
                if is_weekend:
                    prob *= freq_info["weekend"]
                if is_festival:
                    prob *= freq_info["festival"]
                # Cap at ~0.85 per item per transaction
                prob = min(prob, 0.85)
                if random.random() < prob:
                    chosen_products.append(prod)

            if not chosen_products:
                chosen_products = [random.choice(products)]

            # Limit cart size to 1-5 items
            chosen_products = chosen_products[:random.randint(1, 5)]

            total = 0.0
            items_data = []
            for prod in chosen_products:
                qty      = random.randint(1, 3)
                subtotal = round(prod.price * qty, 2)
                total   += subtotal
                items_data.append((prod, qty, prod.price, subtotal))

            total = round(total, 2)
            daily_rev += total

            txn = SaleTransaction(
                branch_id      = BRANCH_ID,
                cashier_id     = cashier.id,
                invoice_number = inv_no,
                total_amount   = total,
                payment_mode   = pay_mode,
                sale_date      = sale_dt,
                created_at     = sale_dt,
            )
            db.add(txn)
            db.flush()

            for prod, qty, unit_price, subtotal in items_data:
                db.add(SaleItem(
                    transaction_id = txn.id,
                    product_id     = prod.id,
                    quantity       = qty,
                    unit_price     = unit_price,
                    subtotal       = subtotal,
                ))

            db.add(PaymentLog(
                transaction_id = txn.id,
                payment_status = "SUCCESS",
                payment_mode   = pay_mode,
                timestamp      = sale_dt,
            ))

        # Upsert BranchRevenue for this day
        rev_row = db.query(BranchRevenue).filter(
            BranchRevenue.branch_id == BRANCH_ID,
            BranchRevenue.date      == date_str_key,
        ).first()
        if rev_row:
            rev_row.daily_revenue += daily_rev
            rev_row.daily_orders  += n_sales
        else:
            db.add(BranchRevenue(
                branch_id=BRANCH_ID, date=date_str_key,
                daily_revenue=round(daily_rev, 2), daily_orders=n_sales,
            ))

    db.commit()
    txn_count = db.query(SaleTransaction).count()
    item_count = db.query(SaleItem).count()
    print(f"[SEED] Sales seeded: {txn_count} transactions, {item_count} sale items (180 days).")


def seed(db: Session):
    # ── Branch Summary ──────────────────────────────────────────────
    if not db.query(BranchSummary).filter(BranchSummary.branch_id == BRANCH_ID).first():
        db.add(BranchSummary(
            branch_id="B001",
            branch_name="DMart Whitefield",
            location="Whitefield Main Road, Bengaluru – 560066",
            today_revenue=84500.0,
            monthly_revenue=2650000.0,
            staff_count=30,
            manager_name="Anjali Menon",
            open_since=datetime.datetime(2018, 3, 15),
        ))

    # ── Products ────────────────────────────────────────────────────
    if db.query(Product).count() == 0:
        for row in PRODUCTS:
            name, cat, subcat, brand, price, stock, reorder, expiry, unit = row
            db.add(Product(
                name=name, category=cat, subcategory=subcat, brand=brand,
                price=price, stock=stock, reorder_level=reorder,
                expiry_days=expiry, unit=unit,
                branch_id=BRANCH_ID, is_active=True,
            ))

    # ── Employees ───────────────────────────────────────────────────
    if db.query(Employee).count() == 0:
        random.seed(42)
        for i in range(30):
            role   = ROLES[i % len(ROLES)]
            shift  = SHIFTS[i % len(SHIFTS)]
            status = "PRESENT" if random.random() > 0.15 else random.choice(["ABSENT","LEAVE"])
            db.add(Employee(
                name=f"{FIRST_NAMES[i]} {LAST_NAMES[i]}",
                role=role, salary=ROLE_SALARY.get(role, 16000),
                shift=shift, attendance_status=status,
                branch_id=BRANCH_ID, is_active=True,
                join_date=datetime.datetime(2020, 1, 1) + datetime.timedelta(days=random.randint(0, 1000)),
            ))

    db.commit()

    # ── Alerts ──────────────────────────────────────────────────────
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

    # ── Expiry alerts ───────────────────────────────────────────────
    perishables = db.query(Product).filter(
        Product.branch_id == BRANCH_ID,
        Product.expiry_days != None,
        Product.expiry_days <= 5,
    ).all()
    for prod in perishables[:3]:
        db.add(Alert(
            product_id=prod.id, alert_type="EXPIRY_ALERT",
            message=f"Expiry alert: {prod.name} expires in {prod.expiry_days} day(s). Consider immediate action.",
            severity="CRITICAL", branch_id=BRANCH_ID,
        ))

    db.commit()
    print(f"[SEED] Core data: {len(PRODUCTS)} products, 30 employees, alerts done.")

    # ── Phase 2+3: Sales history ─────────────────────────────────────
    _seed_sales(db)


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
