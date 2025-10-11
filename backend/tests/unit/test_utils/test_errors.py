"""Tests for custom error classes."""

from src.utils.errors import (
    CacheError,
    RateLimitError,
    UnderfootError,
    UpstreamError,
    ValidationError,
)


def test_underfoot_error_base():
    """Test base UnderfootError."""
    error = UnderfootError("Test error", status_code=500, error_code="TEST_ERROR")
    assert str(error) == "Test error"
    assert error.status_code == 500
    assert error.error_code == "TEST_ERROR"


def test_validation_error():
    """Test ValidationError."""
    error = ValidationError("Invalid input", field="location")
    assert error.status_code == 400
    assert error.error_code == "VALIDATION_ERROR"
    assert error.context.get("field") == "location"


def test_rate_limit_error():
    """Test RateLimitError."""
    error = RateLimitError(retry_after=60)
    assert error.status_code == 429
    assert error.error_code == "RATE_LIMIT_EXCEEDED"
    assert error.context.get("retry_after") == 60


def test_upstream_error():
    """Test UpstreamError."""
    error = UpstreamError("OpenAI", status=503)
    assert "OpenAI" in str(error)
    assert error.status_code == 502
    assert error.error_code == "UPSTREAM_ERROR"
    assert error.context.get("service") == "OpenAI"


def test_cache_error():
    """Test CacheError."""
    error = CacheError("get", key="test-key")
    assert "get" in str(error)
    assert error.status_code == 500
    assert error.error_code == "CACHE_ERROR"
    assert error.context.get("operation") == "get"
