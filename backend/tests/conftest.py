"""Pytest configuration and fixtures."""

import os
import pytest
from unittest.mock import MagicMock


@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing."""
    test_env = {
        "LOG_LEVEL": "DEBUG",
        "OPENAI_API_KEY": "test_openai_key",
        "GOOGLE_MAPS_API_KEY": "test_google_maps_key",
        "SERPAPI_KEY": "test_serpapi_key",
        "REDDIT_CLIENT_ID": "test_reddit_client_id",
        "REDDIT_CLIENT_SECRET": "test_reddit_client_secret",
        "EVENTBRITE_TOKEN": "test_eventbrite_token",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_ANON_KEY": "test_anon_key",
        "SUPABASE_SERVICE_ROLE_KEY": "test_service_role_key",
    }
    for key, value in test_env.items():
        monkeypatch.setenv(key, value)
