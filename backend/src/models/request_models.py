"""Request models with validation."""

from pydantic import BaseModel, Field, field_validator

from src.config.constants import MAX_CHAT_INPUT_LENGTH, MIN_CHAT_INPUT_LENGTH


class SearchRequest(BaseModel):
    """Search request with comprehensive validation."""

    chat_input: str = Field(
        ...,
        min_length=MIN_CHAT_INPUT_LENGTH,
        max_length=MAX_CHAT_INPUT_LENGTH,
        description="User search query",
    )
    force: bool = Field(default=False, description="Force cache bypass")

    @field_validator("chat_input")
    @classmethod
    def sanitize_input(cls, v: str) -> str:
        """Sanitize input to prevent injection attacks.

        Args:
            v: Raw input string

        Returns:
            Sanitized input string

        Raises:
            ValueError: If input contains dangerous patterns
        """
        sanitized = "".join(char for char in v if char.isprintable())

        dangerous_patterns = ["<script", "javascript:", "onerror=", "onclick="]
        for pattern in dangerous_patterns:
            if pattern in sanitized.lower():
                raise ValueError(f"Potentially dangerous input: {pattern}")

        return sanitized.strip()

    class Config:
        extra = "forbid"


class NormalizeLocationRequest(BaseModel):
    """Location normalization request."""

    input: str = Field(..., min_length=1, max_length=200, description="Raw location input")
    force: bool = Field(default=False, description="Force cache bypass")

    class Config:
        extra = "forbid"
