"""Response models."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DebugInfo(BaseModel):
    """Debug information for responses."""

    request_id: str
    execution_time_ms: int
    cache: str | None = None
    upstream_status: int | None = None
    upstream_error: str | None = None


class SearchResponse(BaseModel):
    """Search result response."""

    user_intent: str
    user_location: str
    response: str
    places: list[dict[str, Any]] = Field(default_factory=list)
    debug: DebugInfo


class NormalizeLocationResponse(BaseModel):
    """Location normalization response."""

    input: str
    normalized: str
    confidence: float
    raw_candidates: list[dict[str, Any]] = Field(default_factory=list)
    debug: dict[str, Any]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    timestamp: str
    elapsed_ms: int
    dependencies: dict[str, dict[str, Any]]
    version: str = "0.1.0"


class ErrorResponse(BaseModel):
    """Error response."""

    error: str
    message: str
    request_id: str
    timestamp: str
    context: dict[str, Any] = Field(default_factory=dict)
