"""Chat worker - lightweight FastAPI endpoint."""

import time
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from src.middleware.cors_middleware import add_cors_middleware
from src.middleware.security_middleware import SecurityHeadersMiddleware
from src.middleware.tracing_middleware import RequestTracingMiddleware, request_id_var
from src.models.request_models import SearchRequest
from src.models.response_models import ErrorResponse, HealthResponse
from src.services import cache_service, search_service
from src.utils.errors import UnderfootError
from src.utils.logger import get_logger, setup_logging
from src.utils.input_sanitizer import InputSanitizer, IntentParser

setup_logging()
logger = get_logger(__name__)

app = FastAPI(title="Underfoot Chat Worker", version="0.1.0")

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTracingMiddleware)
add_cors_middleware(app)


@app.exception_handler(UnderfootError)
async def underfoot_error_handler(request: Request, exc: UnderfootError):
    """Handle custom exceptions with structured logging.

    Args:
        request: FastAPI request
        exc: Underfoot error

    Returns:
        JSON error response
    """
    logger.error(
        "request.error",
        error_code=exc.error_code,
        error_msg=exc.message,
        status_code=exc.status_code,
        path=request.url.path,
        method=request.method,
        **exc.context,
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            **exc.to_dict(),
            "request_id": request_id_var.get(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors.

    Args:
        request: FastAPI request
        exc: Validation error

    Returns:
        JSON error response
    """
    logger.warning("request.validation_error", path=request.url.path, errors=exc.errors())

    return JSONResponse(
        status_code=400,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Invalid request data",
            "request_id": request_id_var.get(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    """Catch-all error handler for unexpected exceptions.

    Args:
        request: FastAPI request
        exc: Any exception

    Returns:
        JSON error response
    """
    logger.critical(
        "request.unhandled_exception",
        error_type=type(exc).__name__,
        error_msg=str(exc),
        path=request.url.path,
        method=request.method,
        exc_info=True,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "request_id": request_id_var.get(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Comprehensive health check endpoint.

    Returns:
        Health status and dependency information
    """
    start = time.perf_counter()

    dependencies = {}

    try:
        stats = await cache_service.get_cache_stats()
        dependencies["supabase"] = {"status": "healthy" if stats["connected"] else "unhealthy"}
    except Exception as e:
        dependencies["supabase"] = {"status": "unhealthy", "error": str(e)}

    all_healthy = all(dep["status"] == "healthy" for dep in dependencies.values())

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    health_data = HealthResponse(
        status="healthy" if all_healthy else "degraded",
        timestamp=datetime.now(timezone.utc).isoformat(),
        elapsed_ms=elapsed_ms,
        dependencies=dependencies,
    )

    if not all_healthy:
        logger.warning("health.degraded", **health_data.model_dump())
        raise HTTPException(status_code=503, detail="Service degraded")

    return health_data


@app.post("/underfoot/search")
async def search(request: SearchRequest):
    """Execute search with AI orchestration.

    Args:
        request: Search request with chat input

    Returns:
        Search results with AI-generated response
    """
    try:
        sanitized_input = InputSanitizer.sanitize(request.chat_input)
        
        intent = IntentParser.parse_intent(sanitized_input)
        logger.info("search.intent_parsed", **intent)
        
        vector_query = IntentParser.extract_vector_query(intent)
        
        result = await search_service.execute_search(
            chat_input=sanitized_input,
            force=request.force,
            intent=intent,
            vector_query=vector_query,
        )
        return result

    except UnderfootError:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("search.error", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed")


@app.get("/")
async def root():
    """Root endpoint.

    Returns:
        API information
    """
    return {
        "name": "Underfoot Chat Worker",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "search": "/underfoot/search (POST)",
        },
    }
