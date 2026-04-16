"""
main.py — FastAPI application entrypoint
Branch Core Operations System — DMart Whitefield
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app.routes import products, employees, alerts, branch
from app.models import domain   # noqa: registers all models with Base


# ─── CREATE TABLES ────────────────────────────────────────────────────────────
Base.metadata.drop_all(bind=engine)   # reset schema on restart (dev mode)
Base.metadata.create_all(bind=engine)


# ─── APP ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Branch Core Operations System",
    description="Production-grade branch management API for DMart Whitefield.",
    version="1.0.0",
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
        "status": "ok",
        "app": "Branch Core Operations System",
        "branch": "DMart Whitefield",
        "docs": "/docs",
    }

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
