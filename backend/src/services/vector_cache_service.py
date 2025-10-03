"""Vector-based semantic cache service using OpenAI embeddings and pgvector.

This service extends the basic cache with intelligent semantic similarity matching.
Instead of exact hash matches, it finds cached results with similar INTENT within
a geographic radius.
"""

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from openai import AsyncOpenAI
from supabase import Client, create_client

from src.config.settings import get_settings
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Initialize clients
supabase: Client | None = None
if settings.supabase_url and settings.supabase_anon_key:
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)

openai_client: AsyncOpenAI | None = None
if settings.openai_api_key:
    openai_client = AsyncOpenAI(api_key=settings.openai_api_key)

# Configuration
EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDING_DIMENSIONS = 1536
DEFAULT_SIMILARITY_THRESHOLD = 0.85
DEFAULT_DISTANCE_RADIUS_MILES = 50
DEFAULT_CACHE_TTL_MINUTES = 30


async def generate_intent_embedding(intent: str) -> list[float] | None:
    """Generate embedding for search intent using OpenAI.

    Args:
        intent: The extracted user intent (e.g., "underground bars", "hidden gems")

    Returns:
        1536-dimensional embedding vector or None if failed
    """
    if not openai_client:
        logger.warning("vector.embedding.skip", reason="openai_client_not_initialized")
        return None

    try:
        response = await openai_client.embeddings.create(
            model=EMBEDDING_MODEL, input=intent.strip()
        )
        embedding = response.data[0].embedding
        logger.info("vector.embedding.generated", intent_preview=intent[:50])
        return embedding

    except Exception as e:
        logger.error("vector.embedding.error", error=str(e), intent=intent[:50])
        return None


async def find_similar_intent_nearby(
    intent: str,
    latitude: float,
    longitude: float,
    distance_miles: int = DEFAULT_DISTANCE_RADIUS_MILES,
    similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> dict[str, Any] | None:
    """Find cached results with similar intent within geographic radius.

    This is the main vector search function. It:
    1. Generates an embedding for the user's intent
    2. Searches for cached results with similar intent (85%+ similarity)
    3. Filters by geographic distance (within 50 miles by default)
    4. Returns the best match based on 80% intent + 20% proximity

    Args:
        intent: User's search intent (e.g., "dive bars", "underground spots")
        latitude: User's location latitude
        longitude: User's location longitude
        distance_miles: Maximum distance radius in miles (default: 50)
        similarity_threshold: Minimum intent similarity 0-1 (default: 0.85)

    Returns:
        Cached search results dict or None if no match found
    """
    if not supabase or not openai_client:
        logger.warning("vector.search.skip", reason="clients_not_initialized")
        return None

    try:
        # Generate embedding for the intent
        intent_embedding = await generate_intent_embedding(intent)
        if not intent_embedding:
            return None

        # Call PostgreSQL function to find similar intents nearby
        result = (
            supabase.rpc(
                "find_similar_intents_nearby",
                {
                    "input_intent_embedding": intent_embedding,
                    "user_lat": latitude,
                    "user_lng": longitude,
                    "max_distance_miles": distance_miles,
                    "intent_similarity_threshold": similarity_threshold,
                    "result_limit": 1,  # Only need the best match
                },
            )
            .execute()
        )

        if result.data and len(result.data) > 0:
            best_match = result.data[0]
            logger.info(
                "vector.cache.hit",
                cached_intent=best_match["intent"],
                similarity=best_match["intent_similarity"],
                distance_miles=best_match["distance_miles"],
                relevance_score=best_match["relevance_score"],
            )

            # Update access count for analytics
            supabase.rpc("update_cache_access", {"cache_id": best_match["id"]}).execute()

            return best_match["cached_results"]

        logger.info("vector.cache.miss", intent=intent[:50])
        return None

    except Exception as e:
        logger.error("vector.search.error", error=str(e), intent=intent[:50])
        return None


async def store_semantic_cache(
    intent: str,
    location_data: dict[str, Any],
    search_results: dict[str, Any],
    ttl_minutes: int = DEFAULT_CACHE_TTL_MINUTES,
) -> bool:
    """Store search results in semantic intent cache with vector embedding.

    Args:
        intent: The extracted search intent
        location_data: Geocoded location dict with:
            - location: Full address string
            - city, county, region, country, postal_code: Address components
            - latitude, longitude: Coordinates
        search_results: The complete search response to cache
        ttl_minutes: Cache time-to-live in minutes

    Returns:
        True if successfully cached, False otherwise
    """
    if not supabase or not openai_client:
        logger.warning("vector.store.skip", reason="clients_not_initialized")
        return False

    try:
        # Generate embedding for intent
        intent_embedding = await generate_intent_embedding(intent)
        if not intent_embedding:
            return False

        # Calculate expiration
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)).isoformat()

        # Store in semantic_intent_cache table
        supabase.table("semantic_intent_cache").insert(
            {
                "intent": intent.strip(),
                "intent_embedding": intent_embedding,
                "location": location_data.get("location", ""),
                "city": location_data.get("city"),
                "county": location_data.get("county"),
                "region": location_data.get("region"),
                "country": location_data.get("country"),
                "postal_code": location_data.get("postal_code"),
                "latitude": location_data.get("latitude"),
                "longitude": location_data.get("longitude"),
                "cached_results": search_results,
                "expires_at": expires_at,
            }
        ).execute()

        logger.info(
            "vector.cache.stored",
            intent=intent[:50],
            location=location_data.get("location", "")[:50],
            ttl_minutes=ttl_minutes,
        )
        return True

    except Exception as e:
        logger.error("vector.store.error", error=str(e), intent=intent[:50])
        return False


async def get_vector_cache_stats() -> dict[str, Any]:
    """Get statistics about the vector cache.

    Returns:
        Statistics including cache size, total accesses, etc.
    """
    if not supabase:
        return {"connected": False}

    try:
        result = supabase.rpc("get_cache_statistics").execute()
        return result.data or {"connected": False}

    except Exception as e:
        logger.error("vector.stats.error", error=str(e))
        return {"connected": False, "error": str(e)}
