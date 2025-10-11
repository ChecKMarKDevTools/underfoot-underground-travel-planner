"""Tests for logger utilities."""

from src.utils.logger import get_logger, redact_secrets, setup_logging


def test_get_logger():
    """Test getting a logger instance."""
    logger = get_logger("test_module")
    assert logger is not None


def test_get_logger_with_different_names():
    """Test that different names work."""
    logger1 = get_logger("module1")
    logger2 = get_logger("module2")
    assert logger1 is not None
    assert logger2 is not None


def test_setup_logging():
    """Test setup_logging function."""
    # Should not raise any exceptions
    setup_logging()
    setup_logging("DEBUG")


def test_redact_secrets():
    """Test redacting sensitive data."""
    data = {
        "api_key": "secret123",
        "username": "testuser",
    }
    redacted = redact_secrets(data)
    assert "username" in redacted
