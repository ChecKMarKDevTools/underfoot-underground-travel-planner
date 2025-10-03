"""Reddit RSS service for local recommendations."""

import httpx

from src.config.constants import HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_TIMEOUT_SECONDS
from src.config.settings import get_settings
from src.models.domain_models import SearchResult
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


async def search_reddit_rss(location: str, intent: str) -> list[SearchResult]:
    """Search Reddit RSS for local recommendations.

    Args:
        location: Normalized location
        intent: Search intent

    Returns:
        List of search results
    """
    try:
        query = f"{intent} {location}"
        url = f"https://www.reddit.com/search.json"
        params = {"q": query, "limit": 10, "sort": "relevance"}

        headers = {"User-Agent": "Underfoot/1.0"}

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(HTTP_TIMEOUT_SECONDS, connect=HTTP_CONNECT_TIMEOUT_SECONDS)
        ) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()

        results = []
        for item in data.get("data", {}).get("children", [])[:10]:
            post = item.get("data", {})
            results.append(
                SearchResult(
                    name=post.get("title", "Unknown"),
                    description=post.get("selftext", "")[:200],
                    source="reddit",
                    url=f"https://reddit.com{post.get('permalink', '')}",
                    metadata={
                        "subreddit": post.get("subreddit"),
                        "score": post.get("score"),
                    },
                )
            )

        logger.info(
            "reddit.search_complete",
            location=location,
            intent=intent,
            result_count=len(results),
        )

        return results

    except Exception as e:
        logger.error("reddit.search_failed", error=str(e), location=location, intent=intent)
        return []
