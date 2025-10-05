"""CORS middleware configuration."""

from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import get_settings

settings = get_settings()


def add_cors_middleware(app):
    """Add CORS middleware to FastAPI app.

    Args:
        app: FastAPI application instance
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
    )
