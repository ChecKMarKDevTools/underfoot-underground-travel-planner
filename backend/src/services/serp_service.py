"""SERP API service for hidden gems search."""

import httpx

from src.config.constants import HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_TIMEOUT_SECONDS
from src.config.settings import get_settings
from src.models.domain_models import SearchResult
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


async def search_hidden_gems(location: str, intent: str) -> list[SearchResult]:
    """Search for hidden gems using SERP API.

    Args:
        location: Normalized location
        intent: Search intent

    Returns:
        List of search results
    """
    try:
        query = f"{intent} {location} underground local hidden"
        params = {
            "q": query,
            "location": location,
            "hl": "en",
            "gl": "us",
            "num": 10,
            "api_key": settings.serpapi_key,
        }

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(HTTP_TIMEOUT_SECONDS, connect=HTTP_CONNECT_TIMEOUT_SECONDS)
        ) as client:
            response = await client.get("https://serpapi.com/search", params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("organic_results", [])[:10]:
            results.append(
                SearchResult(
                    name=item.get("title", "Unknown"),
                    description=item.get("snippet", ""),
                    source="serp",
                    url=item.get("link"),
                    metadata={"position": item.get("position")},
                )
            )

        logger.info(
            "serp.search_complete",
            location=location,
            intent=intent,
            result_count=len(results),
        )

        return results

    except Exception as e:
        logger.error("serp.search_failed", error=str(e), location=location, intent=intent)
        return []
