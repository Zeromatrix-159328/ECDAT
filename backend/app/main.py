import os
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.api.v1 import dashboard, assets, scans, risks, mosca, migration, recommendations, graph

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(dashboard.router, prefix=api_v1_prefix)
app.include_router(assets.router, prefix=api_v1_prefix)
app.include_router(scans.router, prefix=api_v1_prefix)
app.include_router(risks.router, prefix=api_v1_prefix)
app.include_router(mosca.router, prefix=api_v1_prefix)
app.include_router(migration.router, prefix=api_v1_prefix)
app.include_router(recommendations.router, prefix=api_v1_prefix)
app.include_router(graph.router, prefix=api_v1_prefix)

@app.get("/", tags=["Root"])
@app.head("/", tags=["Root"])
def root():
    return {
        "message": "Enterprise Cryptographic Discovery & Assessment Tool (ECDAT) API is running",
        "status": "healthy",
        "version": settings.VERSION,
        "docs": f"{api_v1_prefix}/docs",
        "health": f"{api_v1_prefix}/health",
        "frontend": "https://zeromatrix-159328.github.io/ECDAT/"
    }

@app.get("/health", tags=["Health"])
@app.get(f"{api_v1_prefix}/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "ECDAT API",
        "version": settings.VERSION,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

# Check for static dist directories (support single-service unified deployment if present)
dist_paths = [
    os.path.join(os.path.dirname(__file__), "..", "..", "dist"),
    os.path.join(os.path.dirname(__file__), "..", "dist"),
    os.path.join(os.getcwd(), "dist"),
]

static_dir = None
for p in dist_paths:
    if os.path.exists(p) and os.path.isdir(p) and os.path.exists(os.path.join(p, "index.html")):
        static_dir = os.path.abspath(p)
        break

if static_dir:
    assets_path = os.path.join(static_dir, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="static_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        file_path = os.path.join(static_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))
