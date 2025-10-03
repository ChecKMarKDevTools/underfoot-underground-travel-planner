"""CORS middleware configuration."""

from fastapi.middleware.cors import CORSMiddleware

from src.config.settings import get_settings

settings = get_settings()


def add_cors_middleware(app):
    """Add CORS middleware to FastAPI app.

    Args:
        app: FastAPI application instance
    """
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://underfoot.pages.dev",
        "https://checkmarkdevtools.dev",
    ]

    if settings.environment == "development":
        allowed_origins.append("*")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time"],
    )
