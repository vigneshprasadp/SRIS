"""
routes/sales.py
POST /api/sales/create            — create sale (POS endpoint)
GET  /api/sales/history           — sales history
GET  /api/sales/top-products      — top selling products
GET  /api/sales/daily-revenue     — daily revenue trend
GET  /api/sales/category-revenue  — category pie chart data
GET  /api/sales/intelligence      — branch intelligence widgets
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.schemas import (
    SaleCreateRequest, SaleTransactionOut, SalesHistoryResponse,
    TopProductOut, DailyRevenueOut, CategoryRevenueOut, SalesIntelligenceOut,
)
from app.services.sale_service import (
    create_sale, get_sales_history, get_top_products,
    get_daily_revenue, get_category_revenue, get_sales_intelligence,
)

router = APIRouter(prefix="/api/sales", tags=["Sales"])


# ── CREATE SALE ────────────────────────────────────────────────────────────────
@router.post("/create", response_model=SaleTransactionOut, status_code=201,
             summary="Create a sale (POS billing endpoint)")
def pos_create_sale(payload: SaleCreateRequest, db: Session = Depends(get_db)):
    """
    Full atomic sale flow:
    validate → calculate → invoice → save items → reduce stock → update revenue
    """
    return create_sale(db, payload)


# ── SALES HISTORY ──────────────────────────────────────────────────────────────
@router.get("/history", response_model=SalesHistoryResponse, summary="Get sales history")
def sales_history(
    branch_id : str = Query("B001"),
    limit     : int = Query(50, ge=1, le=200),
    db        : Session = Depends(get_db),
):
    total, items = get_sales_history(db, branch_id, limit)
    return {"total": total, "items": items}


# ── TOP SELLING PRODUCTS ───────────────────────────────────────────────────────
@router.get("/top-products", response_model=List[dict], summary="Top selling products")
def top_products(
    branch_id : str = Query("B001"),
    days      : int = Query(7, ge=1, le=90),
    top_n     : int = Query(10, ge=1, le=50),
    db        : Session = Depends(get_db),
):
    return get_top_products(db, branch_id, days, top_n)


# ── DAILY REVENUE TREND ────────────────────────────────────────────────────────
@router.get("/daily-revenue", response_model=List[dict], summary="Daily revenue trend")
def daily_revenue(
    branch_id : str = Query("B001"),
    days      : int = Query(7, ge=1, le=30),
    db        : Session = Depends(get_db),
):
    return get_daily_revenue(db, branch_id, days)


# ── CATEGORY REVENUE ───────────────────────────────────────────────────────────
@router.get("/category-revenue", response_model=List[dict], summary="Revenue by category")
def category_revenue(
    branch_id : str = Query("B001"),
    days      : int = Query(7, ge=1, le=30),
    db        : Session = Depends(get_db),
):
    return get_category_revenue(db, branch_id, days)


# ── SALES INTELLIGENCE ─────────────────────────────────────────────────────────
@router.get("/intelligence", response_model=dict, summary="Branch sales intelligence")
def sales_intelligence(
    branch_id : str = Query("B001"),
    db        : Session = Depends(get_db),
):
    return get_sales_intelligence(db, branch_id)
