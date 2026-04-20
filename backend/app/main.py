"""
main.py — FastAPI application entrypoint
Branch Core Operations System — DMart Whitefield
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routes import products, employees, alerts, branch, sales
from app.models import domain   # noqa: registers all models with Base


# ─── CREATE TABLES ────────────────────────────────────────────────────────────
# NOTE: drop_all removed — tables now persist between restarts so that
#       Phase 2 sales data (transactions, revenue) is not lost on reload.
Base.metadata.create_all(bind=engine)


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Branch Core Operations System",
    description="Production-grade branch management + POS API for DMart Whitefield.",
    version="2.0.0",
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


# ─── STARTUP: seed DB ─────────────────────────────────────────────────────────
@app.on_event("startup")
def auto_seed():
    """Seed demo data on first run (no-op if tables already populated)."""
    try:
        from app.utils.seed import seed
        db = SessionLocal()
        seed(db)
        db.close()
    except Exception as e:
        print(f"[WARN] Seeding skipped: {e}")


# ─── HEALTH ───────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def health():
    return {
        "status"  : "ok",
        "app"     : "Branch Core Operations System",
        "version" : "2.0.0 — Phase 2 (POS + Analytics)",
        "branch"  : "DMart Whitefield",
        "docs"    : "/docs",
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
