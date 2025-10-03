"""Scoring and ranking service for search results."""

from src.models.domain_models import CategorizedResults, ScoringSummary, SearchResult
from src.utils.logger import get_logger

logger = get_logger(__name__)

UNDERGROUND_KEYWORDS = [
    "underground",
    "hidden",
    "secret",
    "local",
    "offbeat",
    "alternative",
    "indie",
    "dive",
    "authentic",
    "quirky",
    "weird",
    "unique",
    "undiscovered",
    "locals only",
]


def score_result(result: SearchResult, intent: str) -> SearchResult:
    """Score a single search result based on relevance.

    Args:
        result: Search result to score
        intent: User's search intent

    Returns:
        Result with updated score
    """
    score = 0.0

    text = f"{result.name} {result.description}".lower()
    intent_lower = intent.lower()

    if intent_lower in text:
        score += 0.3

    underground_count = sum(1 for keyword in UNDERGROUND_KEYWORDS if keyword in text)
    score += min(underground_count * 0.1, 0.4)

    if result.source == "reddit":
        score += 0.2
    elif result.source == "serp":
        score += 0.15

    if result.metadata:
        if result.source == "reddit" and result.metadata.get("score", 0) > 100:
            score += 0.1
        if result.source == "eventbrite":
            score += 0.1

    result.score = min(score, 1.0)
    return result


def score_and_rank_results(results: list[SearchResult], context: dict) -> list[SearchResult]:
    """Score and rank all results.

    Args:
        results: List of search results
        context: Search context with intent and location

    Returns:
        Sorted list of scored results
    """
    intent = context.get("intent", "")

    scored = [score_result(result, intent) for result in results]
    scored.sort(key=lambda x: x.score, reverse=True)

    logger.info(
        "scoring.complete",
        total_results=len(scored),
        avg_score=sum(r.score for r in scored) / len(scored) if scored else 0,
    )

    return scored


def categorize_results(scored_results: list[SearchResult]) -> CategorizedResults:
    """Categorize results into primary and nearby.

    Args:
        scored_results: Scored and ranked results

    Returns:
        Categorized results
    """
    primary_threshold = 0.5

    primary = [r for r in scored_results if r.score >= primary_threshold]
    nearby = [r for r in scored_results if r.score < primary_threshold]

    for result in primary:
        result.category = "primary"
    for result in nearby:
        result.category = "nearby"

    logger.info(
        "categorization.complete",
        primary_count=len(primary),
        nearby_count=len(nearby),
    )

    return CategorizedResults(primary=primary, nearby=nearby)


def generate_scoring_summary(results: list[SearchResult]) -> ScoringSummary:
    """Generate summary statistics for scoring.

    Args:
        results: Scored results

    Returns:
        Scoring summary
    """
    if not results:
        return ScoringSummary(total_results=0, average_score=0.0, max_score=0.0, min_score=0.0)

    scores = [r.score for r in results]

    return ScoringSummary(
        total_results=len(results),
        average_score=sum(scores) / len(scores),
        max_score=max(scores),
        min_score=min(scores),
    )
