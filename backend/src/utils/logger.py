"""Structured logging setup for Cloudflare Workers."""

import logging
from typing import Any

import structlog

from src.config.constants import SENSITIVE_KEYS


def redact_secrets(data: dict[str, Any]) -> dict[str, Any]:
    """Redact sensitive fields from log data.

    Args:
        data: Dictionary potentially containing sensitive data

    Returns:
        Dictionary with sensitive values redacted
    """
    return {k: "***REDACTED***" if k.lower() in SENSITIVE_KEYS else v for k, v in data.items()}


def setup_logging(level: str = "INFO") -> None:
    """Configure structured logging.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        level=getattr(logging, level.upper()),
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured structured logger
    """
    return structlog.get_logger(name)
