"""Domain models."""

from dataclasses import dataclass
from typing import Any


@dataclass
class ParsedInput:
    """Parsed user input."""

    location: str
    intent: str
    confidence: float


@dataclass
class NormalizedLocation:
    """Normalized location data."""

    normalized: str
    confidence: float
    coordinates: dict[str, float] | None = None


@dataclass
class SearchContext:
    """Search context for orchestration."""

    location: str
    intent: str
    coordinates: dict[str, float] | None
    confidence: float


@dataclass
class SearchResult:
    """Single search result."""

    name: str
    description: str
    source: str
    url: str | None = None
    score: float = 0.0
    category: str = "nearby"
    metadata: dict[str, Any] | None = None


@dataclass
class AggregatedResults:
    """Results from multiple sources."""

    serp: list[SearchResult]
    reddit: list[SearchResult]
    eventbrite: list[SearchResult]

    def all_results(self) -> list[SearchResult]:
        """Get all results combined.

        Returns:
            Combined list of all search results
        """
        return self.serp + self.reddit + self.eventbrite


@dataclass
class CategorizedResults:
    """Results categorized by relevance."""

    primary: list[SearchResult]
    nearby: list[SearchResult]


@dataclass
class ScoringSummary:
    """Summary of scoring results."""

    total_results: int
    average_score: float
    max_score: float
    min_score: float
