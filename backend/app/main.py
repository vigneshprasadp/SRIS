"""
main.py — FastAPI application entrypoint
Branch Core Operations System — DMart Whitefield
Phase 4: Multi-Branch Enterprise Admin Intelligence System
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routes import products, employees, alerts, branch, sales
from app.routes import ai as ai_routes
from app.routes import admin as admin_routes          # Phase 4 — Super Admin
from app.routes import auth as auth_routes            # Login endpoint
from app.models import domain   # noqa: registers all models with Base


# ─── CREATE TABLES ────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="SRIS Enterprise Admin System",
    description="Multi-branch retail intelligence platform — Phase 4: Super Admin Control Tower.",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── ROUTERS ──────────────────────────────────────────────────────────────────
app.include_router(products.router)
app.include_router(employees.router)
app.include_router(alerts.router)
app.include_router(branch.router)
app.include_router(sales.router)
app.include_router(ai_routes.router)          # Phase 3 — AI Intelligence
app.include_router(admin_routes.router)       # Phase 4 — Super Admin
app.include_router(auth_routes.router)        # Auth / Login


# ─── STARTUP: seed DB + train ML models ───────────────────────────────────────
@app.on_event("startup")
def startup_tasks():
    """
    1. Seed demo data on first run (no-op if tables already populated).
    2. Auto-train ML models if .pkl files are missing.
    """
    db = SessionLocal()
    try:
        # ── Phase 1/2 seed ────────────────────────────────────
        try:
            from app.utils.seed import seed
            seed(db)
        except Exception as e:
            print(f"[WARN] Seeding skipped: {e}")

        # ── Phase 3 ML auto-train ─────────────────────────────
        try:
            from app.ml.train import auto_train_if_needed
            auto_train_if_needed(db)
        except Exception as e:
            print(f"[WARN] ML training skipped: {e}")
    finally:
        db.close()


# ─── HEALTH ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health():
    return {
        "status"  : "ok",
        "app"     : "SRIS Enterprise Admin System",
        "version" : "4.0.0 — Phase 4 (Multi-Branch Enterprise)",
        "branch"  : "All Branches",
        "docs"    : "/docs",
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
