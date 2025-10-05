"""Input sanitization and prompt injection detection."""

import re
from typing import Dict, List

import bleach


class InputSanitizer:
    """Sanitize user input against XSS, injection attacks, and malicious patterns."""
    
    MAX_LENGTH = 1000
    MIN_LENGTH = 1
    
    PROMPT_INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"disregard\s+(all\s+)?previous\s+instructions?",
        r"forget\s+(all\s+)?previous\s+instructions?",
        r"system\s*:\s*",
        r"<\s*\|.*?\|\s*>",
        r"you\s+are\s+(now\s+)?(?:a|an)\s+\w+",
        r"act\s+as\s+(?:a|an)\s+\w+",
        r"pretend\s+(?:to\s+be|you\s+are)",
        r"roleplay\s+as",
        r"simulate\s+(?:a|an)\s+\w+",
        r"new\s+mode\s*:",
        r"developer\s+mode",
        r"jailbreak",
        r"dan\s+mode",
        r"sudo\s+mode",
        r"\[\s*system\s*\]",
        r"<\s*admin\s*>",
        r"%%\s*system",
        r"execute\s+code",
        r"run\s+python",
        r"eval\s*\(",
        r"exec\s*\(",
        r"__import__",
    ]
    
    @classmethod
    def sanitize(cls, user_input: str) -> str:
        """Sanitize user input.
        
        Args:
            user_input: Raw user input
            
        Returns:
            Sanitized input
            
        Raises:
            ValueError: If input is invalid or contains malicious patterns
        """
        if not user_input or not isinstance(user_input, str):
            raise ValueError("Input must be a non-empty string")
        
        user_input = user_input.strip()
        
        if len(user_input) < cls.MIN_LENGTH:
            raise ValueError(f"Input too short (minimum {cls.MIN_LENGTH} characters)")
        
        if len(user_input) > cls.MAX_LENGTH:
            raise ValueError(f"Input too long (maximum {cls.MAX_LENGTH} characters)")
        
        if cls._detect_prompt_injection(user_input):
            raise ValueError("Potential prompt injection detected")
        
        sanitized = bleach.clean(
            user_input,
            tags=[],
            attributes={},
            strip=True,
            strip_comments=True,
        )
        
        return sanitized
    
    @classmethod
    def _detect_prompt_injection(cls, text: str) -> bool:
        """Detect potential prompt injection attempts.
        
        Args:
            text: User input to check
            
        Returns:
            True if injection pattern detected
        """
        text_lower = text.lower()
        
        for pattern in cls.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        excessive_special_chars = len(re.findall(r'[<>{}[\]|\\]', text))
        if excessive_special_chars > 10:
            return True
        
        if text.count('\n') > 20:
            return True
        
        return False


class IntentParser:
    """Parse user intent from sanitized input."""
    
    @staticmethod
    def parse_intent(sanitized_input: str) -> Dict[str, any]:
        """Parse intent from sanitized input.
        
        Args:
            sanitized_input: Sanitized user input
            
        Returns:
            Intent dictionary
        """
        location_patterns = [
            r'\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'\bat\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            r'\bnear\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]
        
        location = None
        for pattern in location_patterns:
            match = re.search(pattern, sanitized_input)
            if match:
                location = match.group(1)
                break
        
        query_type_keywords = {
            'nightlife': ['bar', 'club', 'nightclub', 'speakeasy', 'jazz', 'music', 'party'],
            'historical': ['ancient', 'historical', 'ruins', 'artifact', 'temple', 'castle'],
            'underground': ['underground', 'tunnel', 'catacombs', 'basement', 'cellar', 'vault'],
            'mystical': ['mystical', 'spiritual', 'sacred', 'ritual', 'mysterious'],
        }
        
        query_type = 'general'
        input_lower = sanitized_input.lower()
        for qtype, keywords in query_type_keywords.items():
            if any(kw in input_lower for kw in keywords):
                query_type = qtype
                break
        
        date_pattern = r'\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b'
        date_match = re.search(date_pattern, sanitized_input)
        date_hint = date_match.group(1) if date_match else None
        
        return {
            "location": location,
            "date_hint": date_hint,
            "query_type": query_type,
            "raw_query": sanitized_input,
        }
    
    @staticmethod
    def extract_vector_query(intent: Dict) -> str:
        """Extract optimized query for vector search.
        
        Args:
            intent: Parsed intent
            
        Returns:
            Vector-optimized query string
        """
        parts = []
        
        if intent.get("query_type") and intent["query_type"] != "general":
            parts.append(intent["query_type"])
        
        if intent.get("location"):
            parts.append(intent["location"])
        
        if not parts and intent.get("raw_query"):
            words = intent["raw_query"].split()[:5]
            parts = words
        
        return " ".join(parts) if parts else intent.get("raw_query", "")
