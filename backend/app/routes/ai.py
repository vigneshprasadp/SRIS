"""
app/routes/ai.py
────────────────────────────────────────────────────────────────────
Phase 3 — AI Intelligence API Routes
"""
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ai_service import (
    predict_sales,
    restock_recommendation,
    get_all_restock_recommendations,
    get_product_clusters,
    get_forecast_chart,
    get_branch_ai_insights,
)

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])


# ── 1. BRANCH AI INSIGHTS (all dashboard widgets in one call) ─────────────────
@router.get(
    "/branch-insights",
    summary="Branch-wide AI insights — stat cards, urgent restock, cluster summary",
)
def branch_insights(
    branch_id: str = Query("B001"),
    db: Session = Depends(get_db),
):
    return get_branch_ai_insights(db, branch_id)


# ── 2. PREDICT NEXT-DAY SALES FOR ONE PRODUCT ─────────────────────────────────
@router.get(
    "/predict-sales/{product_id}",
    summary="Predict next-day demand for a single product",
)
def predict_sales_endpoint(
    product_id: int = Path(..., description="Product DB id"),
    db: Session = Depends(get_db),
):
    return predict_sales(db, product_id)


# ── 3. RESTOCK RECOMMENDATION FOR ONE PRODUCT ─────────────────────────────────
@router.get(
    "/restock-recommendation/{product_id}",
    summary="Smart restock recommendation for a product",
)
def restock_one(
    product_id: int = Path(...),
    db: Session = Depends(get_db),
):
    return restock_recommendation(db, product_id)


# ── 4. SMART RESTOCK — ALL PRODUCTS RANKED BY URGENCY ─────────────────────────
@router.get(
    "/smart-restock-all",
    summary="All products ranked by restock urgency (CRITICAL → OK)",
)
def smart_restock_all(
    branch_id: str = Query("B001"),
    db: Session = Depends(get_db),
):
    return get_all_restock_recommendations(db, branch_id)


# ── 5. PRODUCT PERFORMANCE CLUSTERS ──────────────────────────────────────────
@router.get(
    "/product-clusters",
    summary="Classify all products into Fast Moving / Steady / Slow / Dead Stock",
)
def product_clusters(
    branch_id: str = Query("B001"),
    db: Session = Depends(get_db),
):
    return get_product_clusters(db, branch_id)


# ── 6. FORECAST CHART — ACTUAL vs PREDICTED ───────────────────────────────────
@router.get(
    "/forecast-chart/{product_id}",
    summary="Last-N-day actual vs predicted sales chart data",
)
def forecast_chart(
    product_id: int = Path(...),
    days: int = Query(7, ge=3, le=30),
    db: Session = Depends(get_db),
):
    return get_forecast_chart(db, product_id, days)


# ── 7. EXPORT TRAINING DATA CSV ───────────────────────────────────────────────
@router.get(
    "/export-training-data",
    summary="Download synthetic daily_product_sales.csv used for ML training",
)
def export_training_data(
    branch_id: str = Query("B001"),
    db: Session = Depends(get_db),
):
    """
    Returns the first 200 rows as JSON to demonstrate the training schema.
    For CSV download, use the /docs UI or add Accept: text/csv header.
    """
    from app.ml.train import generate_training_data
    import numpy as np
    X, y = generate_training_data(db)
    cols = ["day_of_week", "weekend_flag", "festival_flag",
            "price_bucket", "reorder_level", "price_norm"]
    rows = []
    for i in range(min(200, len(X))):
        row = {c: float(X[i][j]) for j, c in enumerate(cols)}
        row["quantity_sold"] = int(y[i])
        rows.append(row)
    return {
        "schema"      : cols + ["quantity_sold"],
        "total_rows"  : len(X),
        "sample_rows" : rows,
    }
