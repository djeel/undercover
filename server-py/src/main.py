"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import InMemoryDatabase
from .routes import game_routes, word_routes
from .socket_manager import socket_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown."""
    # Startup
    await InMemoryDatabase.connect()
    yield
    # Shutdown
    await InMemoryDatabase.disconnect()


app = FastAPI(
    title="Undercover API",
    description="Backend API for Undercover SaaS Game",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(game_routes.router, prefix=settings.api_prefix)
app.include_router(word_routes.router, prefix=settings.api_prefix)

# Mount Socket.IO
app.mount("/", socket_manager.app)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
