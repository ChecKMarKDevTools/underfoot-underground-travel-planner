import os
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    openai_api_key: str
    geoapify_api_key: str
    serpapi_key: str
    reddit_client_id: str
    reddit_client_secret: str
    eventbrite_token: str

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str | None = None

    cache_ttl_seconds: int = 60
    sse_max_connections: int = 100
    rate_limit_per_minute: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Get cached settings instance.

    Returns:
        Singleton Settings instance

    Raises:
        ValidationError: If required environment variables are missing
    """
    return Settings()
