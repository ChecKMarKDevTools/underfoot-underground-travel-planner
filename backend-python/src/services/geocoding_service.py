"""Geocoding service using Geoapify."""

import httpx

from src.config.constants import GEOCODING_API_LIMIT, HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_TIMEOUT_SECONDS
from src.config.settings import get_settings
from src.models.domain_models import NormalizedLocation
from src.utils.errors import UpstreamError
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


async def normalize_location(raw_input: str) -> NormalizedLocation:
    """Normalize location using Geoapify geocoding API.

    Args:
        raw_input: Raw location string from user

    Returns:
        Normalized location with coordinates and confidence

    Raises:
        UpstreamError: If geocoding API fails
    """
    try:
        url = f"https://api.geoapify.com/v1/geocode/search"
        params = {
            "text": raw_input.strip(),
            "limit": GEOCODING_API_LIMIT,
            "apiKey": settings.geoapify_api_key,
        }

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(HTTP_TIMEOUT_SECONDS, connect=HTTP_CONNECT_TIMEOUT_SECONDS)
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        features = data.get("features", [])
        if not features:
            logger.warning("geocoding.no_results", input=raw_input)
            return NormalizedLocation(
                normalized=raw_input,
                confidence=0.5,
                coordinates=None,
            )

        feature = features[0]
        props = feature.get("properties", {})

        city = props.get("city") or props.get("town") or props.get("village")
        region = props.get("state") or props.get("region")
        country = props.get("country")

        parts = [p for p in [city, region, country] if p]
        normalized = ", ".join(parts)

        confidence = props.get("rank", {}).get("confidence", 0.8)

        coordinates = None
        if props.get("lat") and props.get("lon"):
            coordinates = {"lat": props["lat"], "lng": props["lon"]}

        logger.info(
            "geocoding.success",
            input=raw_input,
            normalized=normalized,
            confidence=confidence,
        )

        return NormalizedLocation(
            normalized=normalized,
            confidence=confidence,
            coordinates=coordinates,
        )

    except httpx.HTTPStatusError as e:
        logger.error(
            "geocoding.http_error",
            status=e.response.status_code,
            input=raw_input,
        )
        return NormalizedLocation(
            normalized=raw_input,
            confidence=0.5,
            coordinates=None,
        )

    except Exception as e:
        logger.error("geocoding.error", error=str(e), input=raw_input)
        return NormalizedLocation(
            normalized=raw_input,
            confidence=0.5,
            coordinates=None,
        )
