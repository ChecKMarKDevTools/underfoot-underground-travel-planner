"""Input validation and intent parsing utilities."""

import re
from typing import Dict

from src.utils.errors import UnderfootError


class InputValidator:
    """Validate and sanitize user input."""

    MAX_LENGTH = 500
    MIN_LENGTH = 3
    
    BLOCKED_PATTERNS = [
        r"<script",
        r"javascript:",
        r"onerror=",
        r"onclick=",
        r"<iframe",
    ]
    
    @staticmethod
    def validate_chat_input(chat_input: str) -> str:
        """Validate and sanitize chat input.
        
        Args:
            chat_input: Raw user input
            
        Returns:
            Sanitized input
            
        Raises:
            UnderfootError: If input is invalid
        """
        if not chat_input or not chat_input.strip():
            raise UnderfootError(
                error_code="EMPTY_INPUT",
                message="Please provide a location or search query",
                status_code=400,
            )
        
        sanitized = chat_input.strip()
        
        if len(sanitized) < InputValidator.MIN_LENGTH:
            raise UnderfootError(
                error_code="INPUT_TOO_SHORT",
                message=f"Input must be at least {InputValidator.MIN_LENGTH} characters",
                status_code=400,
                context={"length": len(sanitized)},
            )
        
        if len(sanitized) > InputValidator.MAX_LENGTH:
            raise UnderfootError(
                error_code="INPUT_TOO_LONG",
                message=f"Input must be less than {InputValidator.MAX_LENGTH} characters",
                status_code=400,
                context={"length": len(sanitized)},
            )
        
        for pattern in InputValidator.BLOCKED_PATTERNS:
            if re.search(pattern, sanitized, re.IGNORECASE):
                raise UnderfootError(
                    error_code="INVALID_INPUT",
                    message="Input contains prohibited content",
                    status_code=400,
                )
        
        return sanitized


class IntentParser:
    """Parse user intent from chat input."""
    
    LOCATION_PATTERNS = [
        r"\b(?:in|near|around|at)\s+([A-Z][a-zA-Z\s,]+)",
        r"\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b",
        r"\b([A-Z][a-zA-Z\s]+)\b",
    ]
    
    DATE_PATTERNS = [
        r"\b(this\s+(?:weekend|week|month))\b",
        r"\b(next\s+(?:weekend|week|month))\b",
        r"\b(tonight|today|tomorrow)\b",
        r"\b(\d{1,2}/\d{1,2}(?:/\d{2,4})?)\b",
    ]
    
    @staticmethod
    def parse_intent(chat_input: str) -> Dict[str, any]:
        """Parse user intent from input.
        
        Args:
            chat_input: Validated user input
            
        Returns:
            Intent dict with location, dates, and query
        """
        intent = {
            "location": None,
            "date_hint": None,
            "query_type": "general",
            "raw_query": chat_input,
        }
        
        for pattern in IntentParser.LOCATION_PATTERNS:
            match = re.search(pattern, chat_input, re.IGNORECASE)
            if match:
                intent["location"] = match.group(1).strip()
                break
        
        for pattern in IntentParser.DATE_PATTERNS:
            match = re.search(pattern, chat_input, re.IGNORECASE)
            if match:
                intent["date_hint"] = match.group(1).strip()
                break
        
        keywords = chat_input.lower()
        if any(word in keywords for word in ["restaurant", "food", "eat", "dinner", "lunch"]):
            intent["query_type"] = "food"
        elif any(word in keywords for word in ["event", "show", "concert", "festival"]):
            intent["query_type"] = "events"
        elif any(word in keywords for word in ["bar", "club", "drink", "nightlife"]):
            intent["query_type"] = "nightlife"
        elif any(word in keywords for word in ["museum", "art", "gallery", "exhibit"]):
            intent["query_type"] = "culture"
        elif any(word in keywords for word in ["outdoor", "hike", "park", "nature"]):
            intent["query_type"] = "outdoor"
        
        return intent
    
    @staticmethod
    def extract_vector_query(intent: Dict[str, any]) -> str:
        """Extract query optimized for vector search.
        
        Args:
            intent: Parsed intent
            
        Returns:
            Vector search query string
        """
        parts = []
        
        if intent["query_type"] != "general":
            parts.append(intent["query_type"])
        
        if intent["location"]:
            parts.append(intent["location"])
        
        if intent["date_hint"]:
            parts.append(intent["date_hint"])
        
        if not parts:
            return intent["raw_query"]
        
        return " ".join(parts)
