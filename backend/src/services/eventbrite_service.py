"""Eventbrite service for local events."""

import httpx

from src.config.constants import HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_TIMEOUT_SECONDS
from src.config.settings import get_settings
from src.models.domain_models import SearchResult
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


async def search_local_events(location: str, keywords: list[str]) -> list[SearchResult]:
    """Search for local events on Eventbrite.

    Args:
        location: Normalized location
        keywords: List of search keywords

    Returns:
        List of event results
    """
    if not settings.eventbrite_token:
        logger.warning("eventbrite.token_missing", msg="EVENTBRITE_TOKEN not configured, skipping")
        return []

    try:
        query = " ".join(keywords)
        url = "https://www.eventbriteapi.com/v3/events/search/"
        params = {
            "q": query,
            "location.address": location,
            "expand": "venue",
        }
        headers = {"Authorization": f"Bearer {settings.eventbrite_token}"}

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(HTTP_TIMEOUT_SECONDS, connect=HTTP_CONNECT_TIMEOUT_SECONDS)
        ) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        results = []
        for event in data.get("events", [])[:10]:
            results.append(
                SearchResult(
                    name=event.get("name", {}).get("text", "Unknown Event"),
                    description=event.get("description", {}).get("text", "")[:200],
                    source="eventbrite",
                    url=event.get("url"),
                    metadata={
                        "start": event.get("start", {}).get("local"),
                        "venue": event.get("venue", {}).get("name"),
                    },
                )
            )

        logger.info(
            "eventbrite.search_complete",
            location=location,
            keywords=keywords,
            result_count=len(results),
        )

        return results

    except httpx.HTTPStatusError as e:
        logger.error(
            "eventbrite.http_error",
            status_code=e.response.status_code,
            error=str(e),
            location=location,
            keywords=keywords,
            msg=f"Eventbrite API returned {e.response.status_code}. Check token validity and API endpoint.",
        )
        return []
    except Exception as e:
        logger.error(
            "eventbrite.search_failed",
            error=str(e),
            location=location,
            keywords=keywords,
        )
        return []
