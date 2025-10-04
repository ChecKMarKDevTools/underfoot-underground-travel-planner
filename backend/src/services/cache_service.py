"""Cache service with Supabase persistence."""

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from src.config.constants import LOCATION_CACHE_TTL_HOURS, SUPABASE_CACHE_TTL_MINUTES
from src.services.supabase_service import supabase_service
from src.utils.logger import get_logger

logger = get_logger(__name__)


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
    try:
        query_hash = generate_cache_key(query, location)
        result = await supabase_service.get_search_results(query_hash)
        
        if result:
            logger.info("cache.hit", cache_type="search_results", query_hash=query_hash)
        
        return result

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
    try:
        query_hash = generate_cache_key(query, location)
        success = await supabase_service.store_search_results(
            query_hash=query_hash,
            location=location.strip(),
            intent=query.strip(),
            results=results,
            ttl_seconds=ttl_minutes * 60,
        )
        
        if success:
            logger.info("cache.write", cache_type="search_results", query_hash=query_hash)
        
        return success

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
    try:
        stats = await supabase_service.get_stats()
        return stats

    except Exception as e:
        logger.error("cache.stats_error", error=str(e))
        return {"search_results_count": 0, "location_cache_count": 0, "connected": False}
