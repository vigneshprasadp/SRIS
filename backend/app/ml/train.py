"""
app/ml/train.py
───────────────────────────────────────────────────────────────────
Phase 3 — ML Training Pipeline

Two models are trained and saved as .pkl files:

  1. RandomForestRegressor  → demand_forecast.pkl
     Predicts next-day quantity sold for a product given:
       day_of_week, weekend_flag, festival_flag,
       category_encoded, price_bucket, reorder_level

  2. KMeans (k=4)  → product_cluster.pkl
     Classifies products into performance tiers:
       Fast Moving | Steady Seller | Slow Moving | Dead Stock

Training data: 180-day synthetic dataset generated from realistic
category demand patterns. Runs once on first startup; subsequent
restarts skip training if pkl files already exist.
"""
import os
import random
import datetime
import pathlib
import joblib
import numpy as np

from sqlalchemy.orm import Session
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.cluster import KMeans

# ─── paths ────────────────────────────────────────────────────────────────────
ML_DIR    = pathlib.Path(__file__).parent / "models"
DEMAND_PKL  = ML_DIR / "demand_forecast.pkl"
CLUSTER_PKL = ML_DIR / "product_cluster.pkl"
ENCODER_PKL = ML_DIR / "category_encoder.pkl"

ML_DIR.mkdir(parents=True, exist_ok=True)

# ─── realistic category demand bases (units/day at price=100) ─────────────────
CATEGORY_DEMAND = {
    "Dairy"        : {"base": 14, "weekend": 1.15, "stable": True},
    "Grocery"      : {"base": 18, "weekend": 1.10, "stable": True},
    "Bakery"       : {"base": 17, "weekend": 1.30, "stable": True},
    "Beverages"    : {"base": 12, "weekend": 1.40, "stable": False},
    "Snacks"       : {"base": 20, "weekend": 1.50, "stable": False},
    "Household"    : {"base": 6,  "weekend": 1.05, "stable": True},
    "Personal Care": {"base": 8,  "weekend": 1.10, "stable": True},
    "Clothing"     : {"base": 7,  "weekend": 1.75, "stable": False},
    "Health"       : {"base": 5,  "weekend": 1.10, "stable": True},
    "Frozen"       : {"base": 10, "weekend": 1.55, "stable": False},
    "Other"        : {"base": 6,  "weekend": 1.10, "stable": True},
}

# ─── festival calendar (Indian festivals that spike retail) ───────────────────
def _festival_dates(year: int) -> set:
    """Return a set of festival date strings for a given year."""
    festivals = [
        datetime.date(year,  1, 26),   # Republic Day
        datetime.date(year,  3, 25),   # Holi (approx)
        datetime.date(year,  4, 14),   # Tamil New Year
        datetime.date(year,  8, 15),   # Independence Day
        datetime.date(year,  8, 30),   # Onam (approx)
        datetime.date(year, 10, 20),   # Dussehra (approx)
        datetime.date(year, 11,  1),   # Diwali (approx)
        datetime.date(year, 11,  2),   # Diwali day 2
        datetime.date(year, 11,  3),   # Diwali day 3
        datetime.date(year, 12, 25),   # Christmas
        datetime.date(year, 12, 31),   # New Year Eve
    ]
    return {d.strftime("%Y-%m-%d") for d in festivals}


def _price_bucket(price: float) -> int:
    """Discretise price into 5 buckets (0–4)."""
    if price < 50:   return 0
    if price < 100:  return 1
    if price < 200:  return 2
    if price < 400:  return 3
    return 4


def generate_training_data(db: Session):
    """
    Build a 180-day synthetic training dataset from real product catalogue.
    Returns lists X (features) and y (target = quantity sold).
    """
    from app.models.domain import Product

    products = db.query(Product).filter(Product.is_active == True).all()
    if not products:
        return np.array([]).reshape(0, 6), np.array([])

    today     = datetime.date.today()
    start     = today - datetime.timedelta(days=180)
    festivals = _festival_dates(today.year) | _festival_dates(today.year - 1)

    random.seed(42)
    np.random.seed(42)

    X_rows, y_rows = [], []

    for prod in products:
        cat_info  = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        base_qty  = cat_info["base"]
        wknd_mult = cat_info["weekend"]
        is_stable = cat_info["stable"]
        pbucket   = _price_bucket(prod.price)

        # Price elasticity: higher price → lower demand
        price_factor = max(0.3, 1.0 - (pbucket * 0.12))

        for day_offset in range(180):
            d         = start + datetime.timedelta(days=day_offset)
            dow       = d.weekday()          # 0=Mon … 6=Sun
            is_wknd   = 1 if dow >= 5 else 0
            is_fest   = 1 if d.strftime("%Y-%m-%d") in festivals else 0

            # Build daily demand
            mult = wknd_mult if is_wknd else 1.0
            if is_fest:
                mult *= 1.3

            # Stable categories: ±15% noise; impulse: ±35% noise
            noise_range = 0.15 if is_stable else 0.35
            noise       = 1.0 + random.uniform(-noise_range, noise_range)

            qty = max(0, round(base_qty * mult * price_factor * noise))

            X_rows.append([
                dow,                    # 0  day_of_week
                is_wknd,                # 1  weekend_flag
                is_fest,                # 2  festival_flag
                pbucket,                # 3  price_bucket  (encoded later as category_encoded is separate)
                prod.reorder_level,     # 4  reorder_level
                prod.price / 1000.0,    # 5  price_normalised
            ])
            y_rows.append(qty)

    return np.array(X_rows), np.array(y_rows)


def _build_category_feature(db: Session) -> tuple:
    """
    Create one hot / label encoded category feature per product.
    Returns arrays aligned to the product list and the fitted LabelEncoder.
    """
    from app.models.domain import Product
    products = db.query(Product).filter(Product.is_active == True).all()
    cats     = [p.category for p in products]
    le       = LabelEncoder()
    le.fit(cats)
    return products, le


def train_and_save_models(db: Session):
    """
    Full training pipeline:
      1. Generate synthetic dataset
      2. Train RandomForest demand model
      3. Train KMeans product cluster model
      4. Persist all three pkl files
    """
    print("[AI] Generating training data …")
    X, y = generate_training_data(db)
    if X.shape[0] == 0:
        print("[AI] No products found — skipping training.")
        return

    # ── Model 1: Demand Forecasting ────────────────────────────────
    print(f"[AI] Training RandomForestRegressor on {X.shape[0]} rows …")
    rf = RandomForestRegressor(
        n_estimators=120,
        max_depth=10,
        min_samples_leaf=4,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X, y)
    joblib.dump(rf, DEMAND_PKL)
    print(f"[AI] Demand model saved → {DEMAND_PKL}")

    # ── Model 2: Category LabelEncoder ────────────────────────────
    products, le = _build_category_feature(db)
    joblib.dump(le, ENCODER_PKL)
    print(f"[AI] Category encoder saved → {ENCODER_PKL}")

    # ── Model 3: Product Cluster (KMeans) ────────────────────────
    # Features per product: avg_daily_qty (simulated), price_norm, reorder_norm
    from app.models.domain import Product
    prods    = db.query(Product).filter(Product.is_active == True).all()
    cat_info = lambda p: CATEGORY_DEMAND.get(p.category, CATEGORY_DEMAND["Other"])

    cluster_X = []
    for p in prods:
        ci           = cat_info(p)
        avg_daily    = ci["base"] * max(0.3, 1.0 - (_price_bucket(p.price) * 0.12))
        price_norm   = p.price / 1000.0
        reorder_norm = p.reorder_level / 50.0
        cluster_X.append([avg_daily, price_norm, reorder_norm])

    cluster_X = np.array(cluster_X)
    km = KMeans(n_clusters=4, random_state=42, n_init=10)
    km.fit(cluster_X)
    joblib.dump(km, CLUSTER_PKL)
    print(f"[AI] Cluster model saved → {CLUSTER_PKL}")

    print("[AI] ✅ All models trained and saved.")


def auto_train_if_needed(db: Session):
    """Call on startup. Skip if pkl files already exist."""
    if DEMAND_PKL.exists() and CLUSTER_PKL.exists() and ENCODER_PKL.exists():
        print("[AI] Models already exist — skipping training.")
        return
    print("[AI] First run — training models now …")
    train_and_save_models(db)


# ─── Utility: load models (used by ai_service) ────────────────────────────────
def load_demand_model():
    return joblib.load(DEMAND_PKL)

def load_cluster_model():
    return joblib.load(CLUSTER_PKL)

def load_encoder():
    return joblib.load(ENCODER_PKL)

def models_exist() -> bool:
    return DEMAND_PKL.exists() and CLUSTER_PKL.exists() and ENCODER_PKL.exists()
