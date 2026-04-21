"""
app/services/ai_service.py
───────────────────────────────────────────────────────────────────
Phase 3 — AI Prediction + Restock + Cluster + Anomaly Service
"""
import datetime
import math
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.domain import Product, SaleItem, SaleTransaction, BranchRevenue
from app.ml.train import (
    load_demand_model, load_cluster_model, load_encoder,
    models_exist, CATEGORY_DEMAND, _price_bucket, _build_rolling_avgs,
)

BRANCH_ID = "B001"


# ─── helpers ──────────────────────────────────────────────────────────────────
def _tomorrow_features() -> tuple:
    tomorrow = datetime.date.today() + datetime.timedelta(days=1)
    dow      = tomorrow.weekday()
    is_wknd  = 1 if dow >= 5 else 0
    festivals = {
        f"{tomorrow.year}-01-26", f"{tomorrow.year}-03-25",
        f"{tomorrow.year}-08-15", f"{tomorrow.year}-10-20",
        f"{tomorrow.year}-11-01", f"{tomorrow.year}-11-02",
        f"{tomorrow.year}-11-03", f"{tomorrow.year}-12-25",
        f"{tomorrow.year}-12-31",
    }
    is_fest = 1 if tomorrow.strftime("%Y-%m-%d") in festivals else 0
    return dow, is_wknd, is_fest

def _cluster_label(cluster_id: int, km) -> str:
    centers = km.cluster_centers_[:, 0]
    order   = np.argsort(centers)
    rank    = int(np.where(order == cluster_id)[0][0])
    labels  = ["Dead Stock", "Slow Moving", "Steady Seller", "Fast Moving"]
    return labels[min(rank, len(labels) - 1)]

def _priority_badge(current_stock: int, predicted_2d: float, reorder: int) -> str:
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

_rf_model = None
_km_model = None
_le       = None

def _get_models():
    global _rf_model, _km_model, _le
    if not models_exist():
        return None, None, None
    if _rf_model is None:
        _rf_model = load_demand_model()
        _km_model = load_cluster_model()
        _le       = load_encoder()
    return _rf_model, _km_model, _le

def _build_feature_vector(prod, dow, is_wknd, is_fest, r7d, r30d):
    pbucket = _price_bucket(prod.price)
    return np.array([[
        dow,
        is_wknd,
        is_fest,
        pbucket,
        prod.reorder_level / 50.0,
        prod.price / 1000.0,
        r7d  if (r7d is not None and r7d > 0) else 0.0,
        r30d if (r30d is not None and r30d > 0) else 0.0,
    ]])

# ─── CORE: PREDICT NEXT-DAY SALES ─────────────────────────────────────────────
def predict_sales(db: Session, product_id: int, prod=None, rolling_avgs=None) -> dict:
    if prod is None:
        prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        return {"error": "Product not found"}

    rf, km, le    = _get_models()
    dow, is_wknd, is_fest = _tomorrow_features()

    if rolling_avgs is not None:
        r7d  = rolling_avgs.get(product_id, {}).get("avg_7d", None)
        r30d = rolling_avgs.get(product_id, {}).get("avg_30d", None)
    else:
        avgs = _build_rolling_avgs(db)
        r7d  = avgs.get(product_id, {}).get("avg_7d", None)
        r30d = avgs.get(product_id, {}).get("avg_30d", None)

    if rf is None:
        ci  = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        qty = round(ci["base"] * (ci["weekend"] if is_wknd else 1.0))
    else:
        X   = _build_feature_vector(prod, dow, is_wknd, is_fest, r7d or 0.0, r30d or 0.0)
        qty = max(0, int(round(rf.predict(X)[0])))

    if r7d is not None and r7d > 0:
        blended = round(qty * 0.55 + r7d * 0.45)
    else:
        blended = qty

    return {
        "product_id"      : product_id,
        "product_name"    : prod.name,
        "category"        : prod.category,
        "current_stock"   : prod.stock,
        "predicted_sales" : blended,
        "model_pred"      : qty,
        "rolling_avg_7d"  : r7d,
        "rolling_avg_30d" : r30d,
        "unit"            : prod.unit,
    }


# ─── RESTOCK RECOMMENDATION FOR ONE PRODUCT ──────────────────────────────────
def restock_recommendation(db: Session, product_id: int, prod=None, rolling_avgs=None) -> dict:
    if prod is None:
        prod = db.query(Product).filter(Product.id == product_id).first()
        
    pred = predict_sales(db, product_id, prod, rolling_avgs)
    if "error" in pred:
        return pred

    predicted_2d = pred["predicted_sales"] * 2
    future_stock = prod.stock - predicted_2d
    restock_qty  = max(0, math.ceil(
        max(0, prod.reorder_level * 3 - future_stock)
    ))
    priority = _priority_badge(prod.stock, round(predicted_2d), prod.reorder_level)

    return {
        "product_id"            : product_id,
        "product_name"          : prod.name,
        "category"              : prod.category,
        "current_stock"         : prod.stock,
        "reorder_level"         : prod.reorder_level,
        "predicted_sales_2d"    : round(predicted_2d, 1),
        "estimated_future_stock": round(future_stock, 1),
        "recommended_restock"   : restock_qty,
        "priority"              : priority,
        "unit"                  : prod.unit,
    }


# ─── ALL PRODUCTS — SMART RESTOCK TABLE ──────────────────────────────────────
def get_all_restock_recommendations(db: Session, branch_id: str = BRANCH_ID, products=None, rolling_avgs=None) -> list:
    if products is None:
        products = db.query(Product).filter(Product.branch_id == branch_id, Product.is_active == True).all()
    if rolling_avgs is None:
        rolling_avgs = _build_rolling_avgs(db)

    ORDER   = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "OK": 3}
    results = []
    for prod in products:
        rec = restock_recommendation(db, prod.id, prod=prod, rolling_avgs=rolling_avgs)
        results.append(rec)

    results.sort(key=lambda r: ORDER.get(r.get("priority", "OK"), 3))
    return results


# ─── PRODUCT PERFORMANCE CLUSTERS ────────────────────────────────────────────
def get_product_clusters(db: Session, branch_id: str = BRANCH_ID, products=None, rolling_avgs=None) -> dict:
    rf, km, le = _get_models()
    if products is None:
        products = db.query(Product).filter(Product.branch_id == branch_id, Product.is_active == True).all()
    if rolling_avgs is None:
        rolling_avgs = _build_rolling_avgs(db)

    items = []
    for prod in products:
        ci        = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        avg_daily = ci["base"] * max(0.3, 1.0 - (_price_bucket(prod.price) * 0.12))

        real_7d = rolling_avgs.get(prod.id, {}).get("avg_7d", 0.0)
        if real_7d and real_7d > 0:
            avg_daily = avg_daily * 0.4 + real_7d * 0.6

        price_norm   = prod.price / 1000.0
        reorder_norm = prod.reorder_level / 50.0

        if km is not None:
            cluster_id = int(km.predict([[avg_daily, price_norm, reorder_norm]])[0])
            label      = _cluster_label(cluster_id, km)
        else:
            if avg_daily > 15:   label = "Fast Moving"
            elif avg_daily > 8:  label = "Steady Seller"
            elif avg_daily > 3:  label = "Slow Moving"
            else:                label = "Dead Stock"

        items.append({
            "product_id"     : prod.id,
            "product_name"   : prod.name,
            "category"       : prod.category,
            "avg_daily_sales": round(avg_daily, 1),
            "current_stock"  : prod.stock,
            "cluster_label"  : label,
        })

    summary = {}
    for item in items:
        summary[item["cluster_label"]] = summary.get(item["cluster_label"], 0) + 1

    return {"clusters": items, "summary": summary}


# ─── FORECAST CHART: ACTUAL vs PREDICTED ─────────────────────────────────────
def get_forecast_chart(db: Session, product_id: int, days: int = 7) -> list:
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        return []

    rf, km, le = _get_models()
    avgs       = _build_rolling_avgs(db)
    r7d        = avgs.get(product_id, {}).get("avg_7d", 0.0)
    r30d       = avgs.get(product_id, {}).get("avg_30d", 0.0)
    results    = []

    for day_offset in range(days - 1, -1, -1):
        d       = datetime.date.today() - datetime.timedelta(days=day_offset)
        dow     = d.weekday()
        is_wknd = 1 if dow >= 5 else 0
        festivals = {f"{d.year}-01-26", f"{d.year}-11-01", f"{d.year}-11-02", f"{d.year}-12-25"}
        is_fest = 1 if d.strftime("%Y-%m-%d") in festivals else 0

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

        if rf is not None:
            X         = _build_feature_vector(prod, dow, is_wknd, is_fest, r7d, r30d)
            predicted = max(0, int(round(rf.predict(X)[0])))
        else:
            ci        = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
            predicted = round(ci["base"] * (ci["weekend"] if is_wknd else 1.0))

        results.append({
            "date"     : d.strftime("%Y-%m-%d"),
            "label"    : f"{d.strftime('%a')} {d.day}",
            "actual"   : int(actual),
            "predicted": predicted,
        })

    return results


# ─── ANOMALY ALERTS ───────────────────────────────────────────────────────────
def get_anomaly_alerts(db: Session, branch_id: str = BRANCH_ID, products=None, rolling_avgs=None) -> list:
    if products is None:
        products = db.query(Product).filter(Product.branch_id == branch_id, Product.is_active == True).all()
    if rolling_avgs is None:
        rolling_avgs = _build_rolling_avgs(db)

    anomalies = []
    cutoff_3d  = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0)

    # Bulk query sales_3d
    sales_3d_rows = (
        db.query(SaleItem.product_id, func.sum(SaleItem.quantity).label("qty"))
        .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
        .filter(SaleTransaction.sale_date >= cutoff_3d)
        .group_by(SaleItem.product_id)
        .all()
    )
    sales_3d_map = {r.product_id: int(r.qty) for r in sales_3d_rows}

    # Bulk query sales_today
    sales_today_rows = (
        db.query(SaleItem.product_id, func.sum(SaleItem.quantity).label("qty"))
        .join(SaleTransaction, SaleItem.transaction_id == SaleTransaction.id)
        .filter(SaleTransaction.sale_date >= today_start)
        .group_by(SaleItem.product_id)
        .all()
    )
    sales_today_map = {r.product_id: int(r.qty) for r in sales_today_rows}

    for prod in products:
        r7d = rolling_avgs.get(prod.id, {}).get("avg_7d", None)

        sales_3d = sales_3d_map.get(prod.id, 0)
        cat_info = CATEGORY_DEMAND.get(prod.category, CATEGORY_DEMAND["Other"])
        expected_3d = cat_info["base"] * 3 * 0.5

        if sales_3d == 0 and expected_3d >= 5 and prod.stock > 0:
            anomalies.append({
                "product_id"  : prod.id,
                "product_name": prod.name,
                "category"    : prod.category,
                "type"        : "SALES_STALL",
                "severity"    : "WARNING",
                "detail"      : f"Zero sales in 3 days. Expected ~{int(expected_3d)} units. Stock: {prod.stock}.",
            })

        sales_today = sales_today_map.get(prod.id, 0)
        if r7d and r7d > 0 and sales_today > r7d * 2.5 and sales_today > 3:
            anomalies.append({
                "product_id"  : prod.id,
                "product_name": prod.name,
                "category"    : prod.category,
                "type"        : "DEMAND_SPIKE",
                "severity"    : "INFO",
                "detail"      : f"Today's sales ({sales_today}) = {round(sales_today/r7d,1)}x 7d avg ({r7d}). Possible event/promotion.",
            })

        pred = predict_sales(db, prod.id, prod=prod, rolling_avgs=rolling_avgs)
        predicted = pred.get("predicted_sales", 0)
        if prod.stock < prod.reorder_level * 0.4 and predicted > prod.stock:
            anomalies.append({
                "product_id"  : prod.id,
                "product_name": prod.name,
                "category"    : prod.category,
                "type"        : "STOCK_RISK",
                "severity"    : "CRITICAL",
                "detail"      : f"Stock ({prod.stock}) < 40% reorder level. Predicted demand: {predicted} units tomorrow.",
            })

    return anomalies


# ─── BRANCH AI INSIGHTS ───────────────────────────────────────────────────────
def get_branch_ai_insights(db: Session, branch_id: str = BRANCH_ID) -> dict:
    products = db.query(Product).filter(Product.branch_id == branch_id, Product.is_active == True).all()
    
    # Bulk load rolling avgs once to avoid O(N) database queries
    rolling_avgs = _build_rolling_avgs(db)

    total_predicted_revenue = 0.0
    restock_alert_count     = 0
    critical_products       = []

    for prod in products:
        pred  = predict_sales(db, prod.id, prod=prod, rolling_avgs=rolling_avgs)
        qty   = pred.get("predicted_sales", 0)
        total_predicted_revenue += qty * prod.price

        predicted_2d = qty * 2
        priority     = _priority_badge(prod.stock, round(predicted_2d), prod.reorder_level)
        if priority in ("CRITICAL", "HIGH"):
            restock_alert_count += 1
        if priority == "CRITICAL":
            critical_products.append(prod.name)

    cluster_data = get_product_clusters(db, branch_id, products=products, rolling_avgs=rolling_avgs)
    summary      = cluster_data["summary"]
    fast_movers  = summary.get("Fast Moving", 0)
    dead_stock   = summary.get("Dead Stock", 0)

    pred_rev     = round(total_predicted_revenue, 2)
    weekly_pred  = round(pred_rev * 7.3, 2)

    restock_list = get_all_restock_recommendations(db, branch_id, products=products, rolling_avgs=rolling_avgs)
    urgent_5     = [r for r in restock_list if r["priority"] in ("CRITICAL", "HIGH")][:5]

    anomalies = get_anomaly_alerts(db, branch_id, products=products, rolling_avgs=rolling_avgs)
    anomaly_count = len(anomalies)
    stock_risk_count = len([a for a in anomalies if a["type"] == "STOCK_RISK"])

    return {
        "predicted_revenue_tomorrow": pred_rev,
        "weekly_predicted_revenue"  : weekly_pred,
        "restock_alert_count"       : restock_alert_count,
        "critical_products"         : critical_products[:5],
        "fast_movers_count"         : fast_movers,
        "dead_stock_count"          : dead_stock,
        "cluster_summary"           : summary,
        "top_urgent_restock"        : urgent_5,
        "anomaly_count"             : anomaly_count,
        "stock_risk_count"          : stock_risk_count,
    }
