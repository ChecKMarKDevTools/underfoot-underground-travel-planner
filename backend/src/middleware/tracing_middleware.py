"""Request context and tracing middleware."""

import time
from contextvars import ContextVar
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from src.utils.logger import get_logger

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

logger = get_logger(__name__)


def generate_request_id() -> str:
    """Generate unique request ID.

    Returns:
        Unique request identifier
    """
    return f"uf_{uuid4().hex[:12]}"


class RequestTracingMiddleware(BaseHTTPMiddleware):
    """Middleware to add request tracing and logging."""

    async def dispatch(self, request: Request, call_next):
        """Process request with tracing.

        Args:
            request: Incoming request
            call_next: Next middleware/handler

        Returns:
            Response with tracing headers
        """
        request_id = request.headers.get("X-Request-ID") or generate_request_id()
        request_id_var.set(request_id)

        start = time.perf_counter()

        try:
            response = await call_next(request)
            elapsed_ms = int((time.perf_counter() - start) * 1000)

            logger.info(
                "request.complete",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                elapsed_ms=elapsed_ms,
                user_agent=request.headers.get("User-Agent", "unknown")[:100],
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = str(elapsed_ms)

            return response

        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            logger.error(
                "request.failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                elapsed_ms=elapsed_ms,
                error_type=type(e).__name__,
                error_msg=str(e),
                exc_info=True,
            )
            raise
