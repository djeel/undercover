"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import get_database
from .routes import game_routes, word_routes
from .socket_manager import socket_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup/shutdown."""
    # Startup
    db = await get_database()
    yield
    # Shutdown
    await db.disconnect()


app = FastAPI(
    title="Undercover API",
    description="Backend API for Undercover SaaS Game",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://djeel.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(game_routes.router, prefix=settings.api_prefix)
app.include_router(word_routes.router, prefix=settings.api_prefix)

# Mount Socket.IO
# The socket_manager.app is configured with socketio_path=""
# so mounting it at /socket.io correctly handles /socket.io/... requests
app.mount("/socket.io", socket_manager.app)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
