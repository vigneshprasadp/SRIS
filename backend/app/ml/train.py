"""
app/ml/train.py
───────────────────────────────────────────────────────────────────
Phase 3 — ML Training Pipeline (Enhanced)

Models trained and saved as .pkl files:

  1. RandomForestRegressor  → demand_forecast.pkl
     Features (per product × day):
       day_of_week, weekend_flag, festival_flag,
       price_bucket, reorder_level, price_normalised,
       rolling_avg_7d (from real sales), rolling_avg_30d

  2. KMeans (k=4)  → product_cluster.pkl
     Classifies products:
       Fast Moving | Steady Seller | Slow Moving | Dead Stock

  3. LabelEncoder  → category_encoder.pkl

Training data: 180-day realistic synthetic dataset derived from
real product catalogue + actual sale_item data (if present).

Auto-trains on first startup; skips if pkl already exist.
Force re-train: DELETE the pkl files and restart.
"""
import os
import random
import datetime
import pathlib
import joblib
import numpy as np

from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

# ─── paths ────────────────────────────────────────────────────────────────────
ML_DIR      = pathlib.Path(__file__).parent / "models"
DEMAND_PKL  = ML_DIR / "demand_forecast.pkl"
CLUSTER_PKL = ML_DIR / "product_cluster.pkl"
ENCODER_PKL = ML_DIR / "category_encoder.pkl"

ML_DIR.mkdir(parents=True, exist_ok=True)

# ─── realistic category demand bases ─────────────────────────────────────────
CATEGORY_DEMAND = {
    "Dairy":         {"base": 14, "weekend": 1.15, "stable": True},
    "Grocery":       {"base": 18, "weekend": 1.10, "stable": True},
    "Bakery":        {"base": 17, "weekend": 1.30, "stable": True},
    "Beverages":     {"base": 12, "weekend": 1.40, "stable": False},
    "Snacks":        {"base": 20, "weekend": 1.50, "stable": False},
    "Household":     {"base": 6,  "weekend": 1.05, "stable": True},
    "Personal Care": {"base": 8,  "weekend": 1.10, "stable": True},
    "Clothing":      {"base": 7,  "weekend": 1.75, "stable": False},
    "Health":        {"base": 5,  "weekend": 1.10, "stable": True},
    "Frozen":        {"base": 10, "weekend": 1.55, "stable": False},
    "Other":         {"base": 6,  "weekend": 1.10, "stable": True},
}

# ─── Indian festival calendar ─────────────────────────────────────────────────
def _festival_dates(year: int) -> set:
    festivals = [
        datetime.date(year,  1, 26),
        datetime.date(year,  3, 25),
        datetime.date(year,  4, 14),
        datetime.date(year,  8, 15),
        datetime.date(year,  8, 30),
        datetime.date(year, 10, 20),
        datetime.date(year, 11,  1),
        datetime.date(year, 11,  2),
        datetime.date(year, 11,  3),
        datetime.date(year, 12, 25),
        datetime.date(year, 12, 31),
    ]
    return {d.strftime("%Y-%m-%d") for d in festivals}


def _price_bucket(price: float) -> int:
    if price < 50:   return 0
    if price < 100:  return 1
    if price < 200:  return 2
    if price < 400:  return 3
    return 4


# ─── compute REAL rolling averages from sale_items ────────────────────────────
def _build_rolling_avgs(db: Session) -> dict:
    """
    Returns {product_id: {"avg_7d": float, "avg_30d": float}}
    Pulls from actual SaleItem + SaleTransaction tables.
    Falls back to 0.0 if no data exists.
    """
    try:
        from app.models.domain import SaleItem, SaleTransaction
        now = datetime.datetime.utcnow()
        cutoff_7d  = now - datetime.timedelta(days=7)
        cutoff_30d = now - datetime.timedelta(days=30)

        def _sum(cutoff):
            rows = (
                db.query(SaleItem.product_id, func.sum(SaleItem.quantity).label("qty"))
                .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
                .filter(SaleTransaction.sale_date >= cutoff)
                .group_by(SaleItem.product_id)
                .all()
            )
            return {r.product_id: float(r.qty) for r in rows}

        totals_7d  = _sum(cutoff_7d)
        totals_30d = _sum(cutoff_30d)

        all_ids = set(totals_7d) | set(totals_30d)
        result  = {}
        for pid in all_ids:
            result[pid] = {
                "avg_7d" : round(totals_7d.get(pid, 0.0) / 7.0,  2),
                "avg_30d": round(totals_30d.get(pid, 0.0) / 30.0, 2),
            }
        return result
    except Exception as e:
        print(f"[AI] Rolling avg computation skipped: {e}")
        return {}


def generate_training_data(db: Session):
    """
    Build 180-day synthetic training dataset, blended with real rolling avgs
    when Phase 2 sales data exists.

    Returns (X: np.ndarray shape [N,8], y: np.ndarray shape [N])
    Feature columns:
      0  day_of_week
      1  weekend_flag
      2  festival_flag
      3  price_bucket
      4  reorder_level_norm
      5  price_norm
      6  rolling_avg_7d   (real or simulated)
      7  rolling_avg_30d  (real or simulated)
    """
    from app.models.domain import Product

    products = db.query(Product).filter(Product.is_active == True).all()
    if not products:
        return np.array([]).reshape(0, 8), np.array([])

    today    = datetime.date.today()
    start    = today - datetime.timedelta(days=180)
    festivals = _festival_dates(today.year) | _festival_dates(today.year - 1)

    # Real rolling avgs from Phase 2 data (if any)
    rolling_avgs = _build_rolling_avgs(db)

    random.seed(42)
    np.random.seed(42)

    X_rows, y_rows = [], []

    for prod in products:
        cat_info  = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        base_qty  = cat_info["base"]
        wknd_mult = cat_info["weekend"]
        is_stable = cat_info["stable"]
        pbucket   = _price_bucket(prod.price)
        price_factor = max(0.3, 1.0 - (pbucket * 0.12))

        # Real rolling averages (fall back to synthetic estimates)
        real_7d  = rolling_avgs.get(prod.id, {}).get("avg_7d",  base_qty * price_factor)
        real_30d = rolling_avgs.get(prod.id, {}).get("avg_30d", base_qty * price_factor)

        for day_offset in range(180):
            d       = start + datetime.timedelta(days=day_offset)
            dow     = d.weekday()
            is_wknd = 1 if dow >= 5 else 0
            is_fest = 1 if d.strftime("%Y-%m-%d") in festivals else 0

            mult        = wknd_mult if is_wknd else 1.0
            if is_fest: mult *= 1.3

            noise_range = 0.15 if is_stable else 0.35
            noise       = 1.0 + random.uniform(-noise_range, noise_range)
            qty         = max(0, round(base_qty * mult * price_factor * noise))

            # Simulate temporal rolling avgs for historical rows
            # (recent days use real data; older days use synthetic)
            days_ago = (today - d).days
            if days_ago <= 7 and real_7d > 0:
                r7d  = real_7d
                r30d = real_30d
            else:
                r7d  = max(0.0, base_qty * price_factor * (1 + random.uniform(-0.2, 0.2)))
                r30d = max(0.0, base_qty * price_factor * (1 + random.uniform(-0.15, 0.15)))

            X_rows.append([
                dow,                      # 0 day_of_week
                is_wknd,                  # 1 weekend_flag
                is_fest,                  # 2 festival_flag
                pbucket,                  # 3 price_bucket
                prod.reorder_level / 50.0,# 4 reorder_level_norm
                prod.price / 1000.0,      # 5 price_norm
                r7d,                      # 6 rolling_avg_7d
                r30d,                     # 7 rolling_avg_30d
            ])
            y_rows.append(qty)

    return np.array(X_rows), np.array(y_rows)


def train_and_save_models(db: Session):
    """
    Full training pipeline:
      1. Generate training data (synthetic + real blend)
      2. Train RandomForestRegressor with 8 features
      3. Train KMeans product cluster model
      4. Persist all pkl files
    """
    print("[AI] Generating training data …")
    X, y = generate_training_data(db)
    if X.shape[0] == 0:
        print("[AI] No products found — skipping training.")
        return

    # ── Model 1: Demand Forecasting ────────────────────────────────
    print(f"[AI] Training RandomForestRegressor on {X.shape[0]:,} rows ...")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    rf = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)

    # Evaluation
    y_pred = rf.predict(X_test)
    rmse   = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    print(f"[AI] RandomForest trained | RMSE = {rmse:.2f} | features = {X.shape[1]}")

    joblib.dump(rf, DEMAND_PKL)
    print(f"[AI] Demand model saved -> {DEMAND_PKL}")

    # ── Model 2: Category LabelEncoder ────────────────────────────
    from app.models.domain import Product
    products = db.query(Product).filter(Product.is_active == True).all()
    cats = [p.category for p in products]
    le   = LabelEncoder()
    le.fit(cats)
    joblib.dump(le, ENCODER_PKL)
    print(f"[AI] Category encoder saved -> {ENCODER_PKL}")

    # ── Model 3: Product Cluster (KMeans) ─────────────────────────
    rolling_avgs = _build_rolling_avgs(db)

    cluster_X = []
    for p in products:
        ci        = CATEGORY_DEMAND.get(p.category, CATEGORY_DEMAND["Other"])
        avg_daily = ci["base"] * max(0.3, 1.0 - (_price_bucket(p.price) * 0.12))

        # Blend with real 7d rolling if available
        real_7d = rolling_avgs.get(p.id, {}).get("avg_7d", None)
        if real_7d and real_7d > 0:
            avg_daily = avg_daily * 0.4 + real_7d * 0.6

        price_norm   = p.price / 1000.0
        reorder_norm = p.reorder_level / 50.0
        cluster_X.append([avg_daily, price_norm, reorder_norm])

    cluster_X = np.array(cluster_X)
    n_clusters = min(4, len(cluster_X))
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    km.fit(cluster_X)
    joblib.dump(km, CLUSTER_PKL)
    print(f"[AI] Cluster model saved -> {CLUSTER_PKL} (k={n_clusters})")

    print(f"[AI] ✅ All models trained. Training set = {X.shape[0]:,} rows.")


def auto_train_if_needed(db: Session):
    """Call on startup. Skip if pkl files already exist."""
    if DEMAND_PKL.exists() and CLUSTER_PKL.exists() and ENCODER_PKL.exists():
        print("[AI] ML models already exist — skipping training.")
        return
    print("[AI] First run — training ML models now …")
    train_and_save_models(db)


# ─── Utility: load models (used by ai_service) ───────────────────────────────
def load_demand_model():
    return joblib.load(DEMAND_PKL)

def load_cluster_model():
    return joblib.load(CLUSTER_PKL)

def load_encoder():
    return joblib.load(ENCODER_PKL)

def models_exist() -> bool:
    return DEMAND_PKL.exists() and CLUSTER_PKL.exists() and ENCODER_PKL.exists()
