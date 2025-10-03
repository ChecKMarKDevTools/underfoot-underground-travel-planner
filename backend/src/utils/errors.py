"""Custom exceptions with structured context."""

from typing import Any


class UnderfootError(Exception):
    """Base exception for all Underfoot errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        **context: Any,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.context = context
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {"error": self.error_code, "message": self.message, "context": self.context}


class ValidationError(UnderfootError):
    """Input validation failed."""

    def __init__(self, message: str, **context: Any):
        super().__init__(message, 400, "VALIDATION_ERROR", **context)


class RateLimitError(UnderfootError):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int, **context: Any):
        super().__init__(
            "Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED", retry_after=retry_after, **context
        )


class UpstreamError(UnderfootError):
    """External API failed."""

    def __init__(self, service: str, **context: Any):
        super().__init__(
            f"{service} service unavailable", 502, "UPSTREAM_ERROR", service=service, **context
        )


class CacheError(UnderfootError):
    """Cache operation failed."""

    def __init__(self, operation: str, **context: Any):
        super().__init__(
            f"Cache {operation} failed",
            500,
            "CACHE_ERROR",
            operation=operation,
            **context,
        )


class AuthenticationError(UnderfootError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed", **context: Any):
        super().__init__(message, 401, "AUTHENTICATION_ERROR", **context)
