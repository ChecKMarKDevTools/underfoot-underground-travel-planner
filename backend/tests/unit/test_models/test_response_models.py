"""Tests for response models."""

from datetime import datetime

import pytest

from src.models.response_models import (
    DebugInfo,
    ErrorResponse,
    HealthResponse,
    NormalizeLocationResponse,
    SearchResponse,
)


def test_debug_info_creation():
    """Test DebugInfo model creation."""
    debug = DebugInfo(
        request_id="test-123",
        execution_time_ms=100,
    )
    assert debug.request_id == "test-123"
    assert debug.execution_time_ms == 100


def test_debug_info_with_optional_fields():
    """Test DebugInfo with optional fields."""
    debug = DebugInfo(
        request_id="test-123",
        execution_time_ms=100,
        cache="hit",
        upstream_status=200,
    )
    assert debug.cache == "hit"
    assert debug.upstream_status == 200


def test_search_response_creation():
    """Test SearchResponse model creation."""
    debug = DebugInfo(request_id="test-123", execution_time_ms=100)

    response = SearchResponse(
        user_intent="find caves",
        user_location="Virginia",
        response="Found some places",
        places=[],
        debug=debug,
    )

    assert response.user_intent == "find caves"
    assert response.user_location == "Virginia"
    assert len(response.places) == 0


def test_normalize_location_response():
    """Test NormalizeLocationResponse."""
    response = NormalizeLocationResponse(
        input="Grundy, VA",
        normalized="Grundy, VA, USA",
        confidence=0.95,
        raw_candidates=[],
        debug={},
    )
    assert response.input == "Grundy, VA"
    assert response.normalized == "Grundy, VA, USA"
    assert response.confidence == pytest.approx(0.95)


def test_health_response():
    """Test HealthResponse."""
    response = HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        elapsed_ms=50,
        dependencies={},
    )
    assert response.status == "healthy"
    assert response.elapsed_ms == 50


def test_error_response():
    """Test ErrorResponse."""
    response = ErrorResponse(
        error="VALIDATION_ERROR",
        message="Something went wrong",
        request_id="test-123",
        timestamp=datetime.now().isoformat(),
    )
    assert response.error == "VALIDATION_ERROR"
    assert response.message == "Something went wrong"
