"""Unit tests for request models."""

import pytest
from pydantic import ValidationError

from src.models.request_models import SearchRequest, NormalizeLocationRequest


def test_search_request_valid():
    """Test valid search request."""
    request = SearchRequest(chat_input="hidden gems in Portland", force=False)

    assert request.chat_input == "hidden gems in Portland"
    assert request.force is False


def test_search_request_sanitize():
    """Test input sanitization."""
    request = SearchRequest(chat_input="  test query  ")

    assert request.chat_input == "test query"


def test_search_request_dangerous_input():
    """Test rejection of dangerous input patterns."""
    with pytest.raises(ValidationError) as exc_info:
        SearchRequest(chat_input="test <script>alert('xss')</script>")

    errors = exc_info.value.errors()
    assert len(errors) > 0


def test_search_request_too_short():
    """Test rejection of too-short input."""
    with pytest.raises(ValidationError):
        SearchRequest(chat_input="")


def test_search_request_too_long():
    """Test rejection of too-long input."""
    long_input = "a" * 501
    with pytest.raises(ValidationError):
        SearchRequest(chat_input=long_input)


def test_search_request_extra_fields():
    """Test rejection of extra fields."""
    with pytest.raises(ValidationError):
        SearchRequest(chat_input="test", force=False, extra_field="not allowed")


def test_normalize_location_request_valid():
    """Test valid location normalization request."""
    request = NormalizeLocationRequest(input="Portland, OR")

    assert request.input == "Portland, OR"
    assert request.force is False


def test_normalize_location_request_defaults():
    """Test default values."""
    request = NormalizeLocationRequest(input="Seattle")

    assert request.force is False
