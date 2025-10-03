"""Cache service with dual-layer caching (KV + Supabase)."""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client, create_client

from src.config.constants import LOCATION_CACHE_TTL_HOURS, SUPABASE_CACHE_TTL_MINUTES
from src.config.settings import get_settings
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

supabase: Client | None = None
if settings.supabase_url and settings.supabase_anon_key:
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)


def generate_cache_key(query: str, location: str = "") -> str:
    """Generate cache key from query and location.

    Args:
        query: Search query
        location: Optional location filter

    Returns:
        Hash-based cache key
    """
    normalized = f"{query.strip().lower()}|{location.strip().lower()}"
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


async def get_cached_search_results(query: str, location: str) -> dict[str, Any] | None:
    """Get cached search results from Supabase.

    Args:
        query: Search query
        location: Location filter

    Returns:
        Cached results or None if not found
    """
    if not supabase:
        return None

    try:
        query_hash = generate_cache_key(query, location)
        result = (
            supabase.table("search_results")
            .select("*")
            .eq("query_hash", query_hash)
            .gt("expires_at", datetime.now(timezone.utc).isoformat())
            .single()
            .execute()
        )

        if result.data:
            logger.info("cache.hit", cache_type="search_results", query_hash=query_hash)
            return json.loads(result.data["results_json"])

        return None

    except Exception as e:
        logger.warning("cache.read_error", error=str(e), cache_type="search_results")
        return None


async def set_cached_search_results(
    query: str, location: str, results: dict[str, Any], ttl_minutes: int = SUPABASE_CACHE_TTL_MINUTES
) -> bool:
    """Cache search results in Supabase.

    Args:
        query: Search query
        location: Location filter
        results: Results to cache
        ttl_minutes: Time to live in minutes

    Returns:
        True if successful, False otherwise
    """
    if not supabase:
        return False

    try:
        query_hash = generate_cache_key(query, location)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat()

        supabase.table("search_results").upsert(
            {
                "query_hash": query_hash,
                "location": location.strip(),
                "intent": query.strip(),
                "results_json": json.dumps(results),
                "expires_at": expires_at,
            },
            on_conflict="query_hash",
        ).execute()

        logger.info("cache.write", cache_type="search_results", query_hash=query_hash)
        return True

    except Exception as e:
        logger.error("cache.write_error", error=str(e), cache_type="search_results")
        return False


async def get_cached_location(raw_input: str) -> dict[str, Any] | None:
    """Get cached location normalization from Supabase.

    Args:
        raw_input: Raw location input

    Returns:
        Cached location data or None
    """
    if not supabase:
        return None

    try:
        result = (
            supabase.table("location_cache")
            .select("*")
            .eq("raw_input", raw_input.strip().lower())
            .gt("expires_at", datetime.now(timezone.utc).isoformat())
            .single()
            .execute()
        )

        if result.data:
            logger.info("cache.hit", cache_type="location", raw_input=raw_input[:50])
            return {
                "normalized": result.data["normalized_location"],
                "confidence": result.data["confidence"],
                "coordinates": result.data.get("raw_candidates", []),
            }

        return None

    except Exception as e:
        logger.warning("cache.read_error", error=str(e), cache_type="location")
        return None


async def set_cached_location(
    raw_input: str,
    normalized: str,
    confidence: float,
    raw_candidates: list[dict[str, Any]] | None = None,
    ttl_hours: int = LOCATION_CACHE_TTL_HOURS,
) -> bool:
    """Cache location normalization in Supabase.

    Args:
        raw_input: Raw location input
        normalized: Normalized location
        confidence: Confidence score
        raw_candidates: Optional raw geocoding candidates
        ttl_hours: Time to live in hours

    Returns:
        True if successful, False otherwise
    """
    if not supabase:
        return False

    try:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).isoformat()

        supabase.table("location_cache").upsert(
            {
                "raw_input": raw_input.strip().lower(),
                "normalized_location": normalized,
                "confidence": confidence,
                "raw_candidates": raw_candidates or [],
                "expires_at": expires_at,
            },
            on_conflict="raw_input",
        ).execute()

        logger.info("cache.write", cache_type="location", raw_input=raw_input[:50])
        return True

    except Exception as e:
        logger.error("cache.write_error", error=str(e), cache_type="location")
        return False


async def get_cache_stats() -> dict[str, Any]:
    """Get cache statistics.

    Returns:
        Cache statistics including counts and connection status
    """
    if not supabase:
        return {"search_results": 0, "location_cache": 0, "connected": False}

    try:
        search_count = (
            supabase.table("search_results").select("id", count="exact", head=True).execute()
        )
        location_count = (
            supabase.table("location_cache").select("id", count="exact", head=True).execute()
        )

        return {
            "search_results": search_count.count or 0,
            "location_cache": location_count.count or 0,
            "connected": True,
        }

    except Exception as e:
        logger.error("cache.stats_error", error=str(e))
        return {"search_results": 0, "location_cache": 0, "connected": False}
