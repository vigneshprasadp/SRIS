"""
routes/products.py
GET    /api/products              — list with filters + summary counts
GET    /api/products/{id}         — single product
POST   /api/products              — add product
PATCH  /api/products/{id}         — update product details
PUT    /api/products/{id}/stock   — update stock (triggers alert logic)
DELETE /api/products/{id}         — soft-delete product
GET    /api/products/categories   — list valid categories
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.schemas.schemas import (
    ProductResponse, ProductCreate, ProductUpdate,
    ProductStockUpdate, ProductListResponse, MessageResponse,
)
from app.services.product_service import (
    get_all_products, get_product_by_id,
    create_product, update_product, update_product_stock, delete_product,
)
from app.schemas.schemas import VALID_CATEGORIES

router = APIRouter(prefix="/api/products", tags=["Products"])


# ── LIST ─────────────────────────────────────────────────────────────────────
@router.get("", response_model=ProductListResponse, summary="Get all products with summary")
def read_products(
    branch_id    : str            = Query("B001"),
    category     : Optional[str] = Query(None),
    search       : Optional[str] = Query(None),
    stock_status : Optional[str] = Query(None, description="IN_STOCK | LOW_STOCK | OUT_OF_STOCK"),
    skip         : int           = Query(0, ge=0),
    limit        : int           = Query(500, ge=1, le=1000),
    db           : Session       = Depends(get_db),
):
    return get_all_products(db, branch_id, category, search, stock_status, skip, limit)


# ── CATEGORIES ────────────────────────────────────────────────────────────────
@router.get("/categories", response_model=List[str], summary="List valid product categories")
def list_categories():
    return sorted(VALID_CATEGORIES)


# ── SINGLE ────────────────────────────────────────────────────────────────────
@router.get("/{product_id}", response_model=ProductResponse, summary="Get product by ID")
def read_product(product_id: int, db: Session = Depends(get_db)):
    product = get_product_by_id(db, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", response_model=ProductResponse, status_code=201, summary="Add a new product")
def add_product(product: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, product)


# ── PATCH (details) ───────────────────────────────────────────────────────────
@router.patch("/{product_id}", response_model=ProductResponse, summary="Update product details")
def patch_product(product_id: int, update_data: ProductUpdate, db: Session = Depends(get_db)):
    updated = update_product(db, product_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return updated


# ── STOCK UPDATE ──────────────────────────────────────────────────────────────
@router.put("/{product_id}/stock", response_model=ProductResponse, summary="Update stock level")
def update_stock(
    product_id   : int,
    stock_update : ProductStockUpdate,
    db           : Session = Depends(get_db),
):
    """
    Updating stock automatically:
    - Creates LOW_STOCK / OUT_OF_STOCK alert if stock < reorder_level
    - Resolves existing alert if stock becomes sufficient
    - Creates DAMAGED_ITEM alert if reason == 'DAMAGE'
    """
    updated = update_product_stock(db, product_id, stock_update)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return updated


# ── DELETE (soft) ─────────────────────────────────────────────────────────────
@router.delete("/{product_id}", response_model=MessageResponse, summary="Soft-delete product")
def remove_product(product_id: int, db: Session = Depends(get_db)):
    success = delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return {"message": f"Product {product_id} deactivated successfully."}
