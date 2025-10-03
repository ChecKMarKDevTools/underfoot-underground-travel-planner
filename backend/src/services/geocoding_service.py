"""Geocoding service using Google Maps API (GCP $300 credits)."""

import httpx

from src.config.constants import HTTP_CONNECT_TIMEOUT_SECONDS, HTTP_TIMEOUT_SECONDS
from src.config.settings import get_settings
from src.models.domain_models import NormalizedLocation
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


async def normalize_location(raw_input):
    """Normalize location using Google Maps Geocoding API.

    Args:
        raw_input: Raw location string from user

    Returns:
        Normalized location with coordinates and confidence
    """
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": raw_input.strip(),
            "key": settings.google_maps_api_key,
        }

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(HTTP_TIMEOUT_SECONDS, connect=HTTP_CONNECT_TIMEOUT_SECONDS)
        ) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        if data.get("status") != "OK" or not data.get("results"):
            logger.warning("geocoding.no_results", input=raw_input, status=data.get("status"))
            return NormalizedLocation(
                normalized=raw_input,
                confidence=0.5,
                coordinates=None,
            )

        result = data["results"][0]
        normalized = result.get("formatted_address", raw_input)
        
        location = result.get("geometry", {}).get("location", {})
        coordinates = None
        if location.get("lat") and location.get("lng"):
            coordinates = {"lat": location["lat"], "lng": location["lng"]}

        location_type = result.get("geometry", {}).get("location_type", "APPROXIMATE")
        confidence = {
            "ROOFTOP": 1.0,
            "RANGE_INTERPOLATED": 0.9,
            "GEOMETRIC_CENTER": 0.8,
            "APPROXIMATE": 0.7,
        }.get(location_type, 0.6)

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
