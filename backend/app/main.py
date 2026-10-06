from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, users, products, locations, pallets, transactions, dashboard, qr, settings as settings_api

app = FastAPI(
    title="Warehouse Pallet Tracking System",
    description="A complete warehouse stock/pallet tracking web application",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(locations.router, prefix="/locations", tags=["Locations"])
app.include_router(pallets.router, prefix="/pallets", tags=["Pallets"])
app.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(qr.router, prefix="/qr", tags=["QR Codes"])
app.include_router(settings_api.router, prefix="/settings", tags=["Settings"])


@app.get("/")
async def root():
    return {
        "message": "Warehouse Pallet Tracking System API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
