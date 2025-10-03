"""Search orchestration service."""

import asyncio
import time
from dataclasses import asdict
from uuid import uuid4

from src.models.domain_models import SearchContext
from src.services import (
    cache_service,
    eventbrite_service,
    geocoding_service,
    openai_service,
    reddit_service,
    scoring_service,
    serp_service,
)
from src.utils.logger import get_logger

logger = get_logger(__name__)


async def execute_search(chat_input: str, force: bool = False) -> dict:
    """Execute complete search orchestration.

    Args:
        chat_input: User's search query
        force: Force bypass cache

    Returns:
        Complete search response
    """
    started = time.perf_counter()
    request_id = f"search_{uuid4().hex[:12]}"

    logger.info("search.start", request_id=request_id, input_preview=chat_input[:100])

    if not force:
        cached = await cache_service.get_cached_search_results(chat_input, "")
        if cached:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "search.cache_hit",
                request_id=request_id,
                elapsed_ms=elapsed_ms,
            )
            return {
                **cached,
                "debug": {
                    **cached.get("debug", {}),
                    "cache": "hit",
                    "request_id": request_id,
                    "execution_time_ms": elapsed_ms,
                },
            }

    parsed = await openai_service.parse_user_input(chat_input)
    if not parsed.location or not parsed.intent:
        raise ValueError("Unable to parse location and intent from input")

    normalized = await geocoding_service.normalize_location(parsed.location)

    search_context = SearchContext(
        location=normalized.normalized,
        intent=parsed.intent,
        coordinates=normalized.coordinates,
        confidence=normalized.confidence,
    )

    data_source_started = time.perf_counter()
    results = await asyncio.gather(
        serp_service.search_hidden_gems(search_context.location, parsed.intent),
        reddit_service.search_reddit_rss(search_context.location, parsed.intent),
        eventbrite_service.search_local_events(search_context.location, [parsed.intent]),
        return_exceptions=True,
    )

    all_results = []
    source_stats = {}

    for idx, result in enumerate(results):
        source_name = ["serpapi", "reddit", "eventbrite"][idx]
        if isinstance(result, Exception):
            logger.error(f"{source_name}.failed", error=str(result))
            source_stats[source_name] = {"count": 0, "status": "failed", "error": str(result)}
        else:
            all_results.extend(result)
            source_stats[source_name] = {"count": len(result), "status": "success"}

    scored_results = scoring_service.score_and_rank_results(
        all_results, {"intent": parsed.intent, "location": search_context.location}
    )
    categorized = scoring_service.categorize_results(scored_results)
    summary = scoring_service.generate_scoring_summary(scored_results)

    places_for_response = [
        {
            "name": r.name,
            "description": r.description,
            "source": r.source,
            "url": r.url,
            "score": r.score,
            "category": r.category,
        }
        for r in (categorized.primary + categorized.nearby)
    ]

    response = await openai_service.generate_response(
        parsed.intent, search_context.location, places_for_response, asdict(summary)
    )

    final_result = {
        "user_intent": parsed.intent,
        "user_location": search_context.location,
        "response": response,
        "places": places_for_response,
        "debug": {
            "request_id": request_id,
            "execution_time_ms": int((time.perf_counter() - started) * 1000),
            "data_source_ms": int((time.perf_counter() - data_source_started) * 1000),
            "parsed": asdict(parsed),
            "normalized_location": asdict(normalized),
            "source_stats": source_stats,
            "scoring_summary": asdict(summary),
            "cache_status": "miss",
        },
    }

    await cache_service.set_cached_search_results(
        chat_input, search_context.location, final_result, 30
    )

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "search.complete",
        request_id=request_id,
        elapsed_ms=elapsed_ms,
        result_count=len(places_for_response),
        primary_count=len(categorized.primary),
        nearby_count=len(categorized.nearby),
    )

    return final_result
