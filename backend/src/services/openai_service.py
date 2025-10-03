"""OpenAI service for parsing and response generation."""

import json
from typing import Any

from openai import AsyncOpenAI

from src.config.constants import (
    INTENT_KEYWORDS,
    OPENAI_MAX_TOKENS_PARSE,
    OPENAI_MAX_TOKENS_RESPONSE,
    OPENAI_MODEL,
    OPENAI_TEMPERATURE,
)
from src.config.settings import get_settings
from src.models.domain_models import ParsedInput
from src.utils.errors import UpstreamError
from src.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def parse_user_input(user_input: str) -> ParsedInput:
    """Parse user input to extract location and intent.

    Args:
        user_input: Raw user query

    Returns:
        Parsed input with location, intent, and confidence

    Raises:
        UpstreamError: If OpenAI API fails
    """
    try:
        completion = await client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=OPENAI_TEMPERATURE,
            max_tokens=OPENAI_MAX_TOKENS_PARSE,
            messages=[
                {
                    "role": "system",
                    "content": """Parse travel queries into location and intent. Return JSON with "location" and "intent" fields.

Examples:
"hidden gems in Pikeville KY" -> {"location": "Pikeville, KY", "intent": "hidden gems"}
"cool underground spots near Atlanta" -> {"location": "Atlanta, GA", "intent": "underground spots"}
"weird stuff to do in Portland Oregon" -> {"location": "Portland, OR", "intent": "weird stuff"}

Extract the most specific location and the clearest intent description.""",
                },
                {"role": "user", "content": user_input},
            ],
        )

        result = json.loads(completion.choices[0].message.content or "{}")

        return ParsedInput(
            location=result.get("location", ""),
            intent=result.get("intent", ""),
            confidence=0.8,
        )

    except Exception as e:
        logger.warning(
            "openai.parse_failed",
            error=str(e),
            input_preview=user_input[:100],
        )
        return _parse_heuristically(user_input)


def _parse_heuristically(user_input: str) -> ParsedInput:
    """Fallback heuristic parsing when OpenAI fails.

    Args:
        user_input: Raw user input

    Returns:
        Heuristically parsed input
    """
    text = user_input.lower()

    location_patterns = [
        r"in\s+([^,]+,?\s*[a-z]{2})",
        r"near\s+([^,]+)",
        r"([^,]+,\s*[a-z]{2})",
        r"([a-z\s]+(?:city|town|ville|burg|port))",
    ]

    import re

    location = ""
    for pattern in location_patterns:
        match = re.search(pattern, user_input, re.IGNORECASE)
        if match:
            location = match.group(1).strip()
            break

    intent = "hidden gems"
    for keyword in INTENT_KEYWORDS:
        if keyword in text:
            intent = keyword
            break

    return ParsedInput(
        location=location or "unknown",
        intent=intent,
        confidence=0.6 if location else 0.3,
    )


async def generate_response(
    intent: str, location: str, places: list[dict[str, Any]], summary: dict[str, Any]
) -> str:
    """Generate Stonewalker-style response.

    Args:
        intent: User's search intent
        location: Normalized location
        places: List of discovered places
        summary: Scoring summary

    Returns:
        Generated response text

    Raises:
        UpstreamError: If OpenAI API fails
    """
    try:
        places_text = "\n".join(
            [f"• {p.get('name', 'Unknown')}: {p.get('description', '')[:100]}" for p in places[:5]]
        )

        completion = await client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0.4,
            max_tokens=OPENAI_MAX_TOKENS_RESPONSE,
            messages=[
                {
                    "role": "system",
                    "content": """You are Stonewalker, a mystical and concise travel guide who uncovers hidden places.

Respond with wisdom and brevity in 2-3 sentences. Be helpful but never overly enthusiastic.
Reference the specific places found and give practical advice.

Style: Mystical, wise, slightly mysterious, but practical and helpful.""",
                },
                {
                    "role": "user",
                    "content": f"""User seeks: {intent} in {location}

Found places:
{places_text}

Scoring summary: {summary.get('total_results', 0)} results, average score {summary.get('average_score', 0):.1f}/1.0

Write a brief Stonewalker response.""",
                },
            ],
        )

        return completion.choices[0].message.content or _generate_fallback_response(
            intent, location, places
        )

    except Exception as e:
        logger.error("openai.generate_failed", error=str(e))
        return _generate_fallback_response(intent, location, places)


def _generate_fallback_response(intent: str, location: str, places: list[dict[str, Any]]) -> str:
    """Generate fallback response when OpenAI fails.

    Args:
        intent: User's intent
        location: Location name
        places: List of places

    Returns:
        Fallback response text
    """
    total = len(places)

    if total == 0:
        return f"The paths around {location} remain elusive for {intent}. Perhaps broaden your search or try a different approach—sometimes the best discoveries lie in unexpected directions."

    if total >= 3:
        return f"{location} reveals {total} intriguing spots for {intent}. These places whisper of authentic experiences—venture forth with curiosity and an open mind."

    return f"{location} offers {total} discoveries for {intent}. Some paths lead nearby, others require a short journey—but each promises something beyond the ordinary tourist trail."
