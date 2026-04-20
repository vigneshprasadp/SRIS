"""
app/services/ai_service.py
───────────────────────────────────────────────────────────────────
Phase 3 — AI Prediction + Restock + Cluster Service

All public functions accept `db: Session` and return plain dicts / lists
(no ORM objects) so FastAPI can JSON-serialize them directly.
"""
import datetime
import math
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.domain import Product, SaleItem, SaleTransaction, BranchRevenue
from app.ml.train import (
    load_demand_model, load_cluster_model, load_encoder,
    models_exist, CATEGORY_DEMAND, _price_bucket,
)

BRANCH_ID = "B001"


# ─── helpers ─────────────────────────────────────────────────────────────────
def _today_features() -> tuple:
    """Return (day_of_week, is_weekend, is_festival) for tomorrow's prediction."""
    tomorrow   = datetime.date.today() + datetime.timedelta(days=1)
    dow        = tomorrow.weekday()        # 0 Mon … 6 Sun
    is_weekend = 1 if dow >= 5 else 0
    # Simple festival detection (same list as train.py)
    festivals = {
        f"{tomorrow.year}-01-26", f"{tomorrow.year}-03-25",
        f"{tomorrow.year}-08-15", f"{tomorrow.year}-10-20",
        f"{tomorrow.year}-11-01", f"{tomorrow.year}-11-02",
        f"{tomorrow.year}-11-03", f"{tomorrow.year}-12-25",
        f"{tomorrow.year}-12-31",
    }
    is_festival = 1 if tomorrow.strftime("%Y-%m-%d") in festivals else 0
    return dow, is_weekend, is_festival


def _rolling_avg_7d(db: Session, product_id: int) -> float | None:
    """Average units sold per day over last 7 days from real Phase 2 data."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    result = (
        db.query(func.sum(SaleItem.quantity))
        .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
        .filter(
            SaleItem.product_id == product_id,
            SaleTransaction.sale_date >= cutoff,
        )
        .scalar()
    )
    if result is None:
        return None
    return round(result / 7.0, 2)


def _cluster_label(cluster_id: int, km) -> str:
    """Map KMeans cluster index → human-readable label.
    Determined by sorting cluster centres by avg_daily_qty (feature[0])."""
    centers  = km.cluster_centers_[:, 0]   # avg_daily_qty feature
    order    = np.argsort(centers)          # ascending order of demand
    rank     = int(np.where(order == cluster_id)[0][0])
    labels   = ["Dead Stock", "Slow Moving", "Steady Seller", "Fast Moving"]
    return labels[rank]


def _priority_badge(current_stock: int, predicted_2d: int, reorder: int) -> str:
    future = current_stock - predicted_2d
    if current_stock <= 0:
        return "CRITICAL"
    if future < 0 or current_stock < reorder * 0.5:
        return "CRITICAL"
    if future < reorder:
        return "HIGH"
    if future < reorder * 2:
        return "MEDIUM"
    return "OK"


# ─── MODEL CACHE (loaded once per process) ───────────────────────────────────
_rf_model   = None
_km_model   = None
_le         = None

def _get_models():
    global _rf_model, _km_model, _le
    if not models_exist():
        return None, None, None
    if _rf_model is None:
        _rf_model = load_demand_model()
        _km_model = load_cluster_model()
        _le       = load_encoder()
    return _rf_model, _km_model, _le


# ─── CORE: PREDICT NEXT-DAY SALES FOR ONE PRODUCT ────────────────────────────
def predict_sales(db: Session, product_id: int) -> dict:
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        return {"error": "Product not found"}

    rf, km, le = _get_models()
    dow, is_wknd, is_fest = _today_features()
    pbucket = _price_bucket(prod.price)

    if rf is None:
        # Fallback: category-based heuristic
        ci  = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        qty = round(ci["base"] * (ci["weekend"] if is_wknd else 1.0))
    else:
        X = np.array([[
            dow,
            is_wknd,
            is_fest,
            pbucket,
            prod.reorder_level,
            prod.price / 1000.0,
        ]])
        qty = max(0, int(round(rf.predict(X)[0])))

    # Blend with real 7-day rolling average (if data exists)
    rolling = _rolling_avg_7d(db, product_id)
    if rolling is not None and rolling > 0:
        blended = round(qty * 0.55 + rolling * 0.45)
    else:
        blended = qty

    return {
        "product_id"      : product_id,
        "product_name"    : prod.name,
        "category"        : prod.category,
        "current_stock"   : prod.stock,
        "predicted_sales" : blended,
        "model_pred"      : qty,
        "rolling_avg_7d"  : rolling,
        "unit"            : prod.unit,
    }


# ─── RESTOCK RECOMMENDATION FOR ONE PRODUCT ──────────────────────────────────
def restock_recommendation(db: Session, product_id: int) -> dict:
    pred = predict_sales(db, product_id)
    if "error" in pred:
        return pred

    prod         = db.query(Product).filter(Product.id == product_id).first()
    predicted_2d = pred["predicted_sales"] * 2          # 2-day lead time
    future_stock = prod.stock - predicted_2d
    restock_qty  = max(0, math.ceil(
        max(0, prod.reorder_level * 3 - future_stock)   # order up to 3× reorder
    ))
    priority = _priority_badge(prod.stock, round(predicted_2d), prod.reorder_level)

    return {
        "product_id"          : product_id,
        "product_name"        : prod.name,
        "category"            : prod.category,
        "current_stock"       : prod.stock,
        "reorder_level"       : prod.reorder_level,
        "predicted_sales_2d"  : round(predicted_2d, 1),
        "estimated_future_stock": round(future_stock, 1),
        "recommended_restock" : restock_qty,
        "priority"            : priority,
        "unit"                : prod.unit,
    }


# ─── ALL PRODUCTS — SMART RESTOCK TABLE ──────────────────────────────────────
def get_all_restock_recommendations(db: Session, branch_id: str = BRANCH_ID) -> list:
    """Return all products sorted by urgency (CRITICAL → HIGH → MEDIUM → OK)."""
    products = db.query(Product).filter(
        Product.branch_id == branch_id,
        Product.is_active == True,
    ).all()

    ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "OK": 3}
    results = []
    for prod in products:
        rec = restock_recommendation(db, prod.id)
        results.append(rec)

    results.sort(key=lambda r: ORDER.get(r.get("priority", "OK"), 3))
    return results


# ─── PRODUCT PERFORMANCE CLUSTERS ────────────────────────────────────────────
def get_product_clusters(db: Session, branch_id: str = BRANCH_ID) -> dict:
    """
    Returns a dict with:
      - clusters: list of {product_id, name, category, cluster_label, avg_daily_sales}
      - summary:  {Fast Moving: N, Steady Seller: N, Slow Moving: N, Dead Stock: N}
    """
    rf, km, le = _get_models()
    products   = db.query(Product).filter(
        Product.branch_id == branch_id,
        Product.is_active == True,
    ).all()

    items    = []
    for prod in products:
        ci        = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        avg_daily = ci["base"] * max(0.3, 1.0 - (_price_bucket(prod.price) * 0.12))

        # blend with real rolling avg if available
        rolling = _rolling_avg_7d(db, prod.id)
        if rolling is not None and rolling > 0:
            avg_daily = avg_daily * 0.5 + rolling * 0.5

        price_norm   = prod.price / 1000.0
        reorder_norm = prod.reorder_level / 50.0

        if km is not None:
            cluster_id  = int(km.predict([[avg_daily, price_norm, reorder_norm]])[0])
            label       = _cluster_label(cluster_id, km)
        else:
            # Heuristic fallback
            if avg_daily > 15:
                label = "Fast Moving"
            elif avg_daily > 8:
                label = "Steady Seller"
            elif avg_daily > 3:
                label = "Slow Moving"
            else:
                label = "Dead Stock"

        items.append({
            "product_id"    : prod.id,
            "product_name"  : prod.name,
            "category"      : prod.category,
            "avg_daily_sales": round(avg_daily, 1),
            "current_stock" : prod.stock,
            "cluster_label" : label,
        })

    summary = {}
    for item in items:
        summary[item["cluster_label"]] = summary.get(item["cluster_label"], 0) + 1

    return {"clusters": items, "summary": summary}


# ─── FORECAST CHART: ACTUAL vs PREDICTED (last N days) ───────────────────────
def get_forecast_chart(db: Session, product_id: int, days: int = 7) -> list:
    """
    Returns list of {date, actual, predicted} dicts for the last `days` days.
    Actual comes from real sale_items. Predicted is the model's per-day estimate.
    """
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        return []

    rf, km, le = _get_models()
    results    = []

    for day_offset in range(days - 1, -1, -1):
        d       = datetime.date.today() - datetime.timedelta(days=day_offset)
        dow     = d.weekday()
        is_wknd = 1 if dow >= 5 else 0
        festivals = {
            f"{d.year}-01-26", f"{d.year}-11-01",
            f"{d.year}-11-02", f"{d.year}-12-25",
        }
        is_fest = 1 if d.strftime("%Y-%m-%d") in festivals else 0
        pbucket = _price_bucket(prod.price)

        # Actual sales that day
        day_start = datetime.datetime.combine(d, datetime.time.min)
        day_end   = datetime.datetime.combine(d, datetime.time.max)
        actual = (
            db.query(func.sum(SaleItem.quantity))
            .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
            .filter(
                SaleItem.product_id == product_id,
                SaleTransaction.sale_date >= day_start,
                SaleTransaction.sale_date <= day_end,
            )
            .scalar()
        ) or 0

        # Predicted
        if rf is not None:
            X   = np.array([[dow, is_wknd, is_fest, pbucket, prod.reorder_level, prod.price / 1000.0]])
            predicted = max(0, int(round(rf.predict(X)[0])))
        else:
            ci        = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
            mult      = ci["weekend"] if is_wknd else 1.0
            predicted = round(ci["base"] * mult)

        results.append({
            "date"      : d.strftime("%Y-%m-%d"),
            "label"     : d.strftime("%a %-d") if hasattr(d, "strftime") else d.strftime("%a %d"),
            "actual"    : int(actual),
            "predicted" : predicted,
        })

    return results


# ─── BRANCH AI INSIGHTS (aggregated for dashboard widgets) ───────────────────
def get_branch_ai_insights(db: Session, branch_id: str = BRANCH_ID) -> dict:
    """One API call that powers all 4 stat cards + restock alerts."""
    products = db.query(Product).filter(
        Product.branch_id == branch_id,
        Product.is_active == True,
    ).all()

    total_predicted_revenue = 0.0
    restock_alert_count     = 0
    critical_products       = []

    for prod in products:
        pred = predict_sales(db, prod.id)
        qty  = pred.get("predicted_sales", 0)
        total_predicted_revenue += qty * prod.price

        predicted_2d = qty * 2
        priority     = _priority_badge(prod.stock, round(predicted_2d), prod.reorder_level)
        if priority in ("CRITICAL", "HIGH"):
            restock_alert_count += 1
        if priority == "CRITICAL":
            critical_products.append(prod.name)

    # Product performance
    cluster_data = get_product_clusters(db, branch_id)
    summary      = cluster_data["summary"]
    fast_movers  = summary.get("Fast Moving", 0)
    dead_stock   = summary.get("Dead Stock", 0)

    # Predicted revenue tomorrow
    pred_rev = round(total_predicted_revenue, 2)

    # Top restock urgent (top 5)
    restock_list = get_all_restock_recommendations(db, branch_id)
    urgent_5     = [r for r in restock_list if r["priority"] in ("CRITICAL", "HIGH")][:5]

    # Weekly predicted revenue (rough: 7× today's pred)
    dow_today = datetime.date.today().weekday()
    weekday_factor = 1.0
    # weekends typically 30% higher
    weekly_pred = round(pred_rev * (7 + 2 * 0.3), 2)

    return {
        "predicted_revenue_tomorrow": pred_rev,
        "restock_alert_count"       : restock_alert_count,
        "critical_products"         : critical_products[:5],
        "fast_movers_count"         : fast_movers,
        "dead_stock_count"          : dead_stock,
        "weekly_predicted_revenue"  : weekly_pred,
        "cluster_summary"           : summary,
        "top_urgent_restock"        : urgent_5,
    }
