"""Unit tests for scoring service."""

import pytest

from src.models.domain_models import SearchResult
from src.services import scoring_service


def test_score_result_with_intent_match():
    """Test scoring when result matches intent."""
    result = SearchResult(
        name="Hidden Gem Bar",
        description="A secret underground bar locals love",
        source="reddit",
        url="https://reddit.com/r/test",
    )

    scored = scoring_service.score_result(result, "hidden gem")

    assert scored.score > 0.3
    assert scored.score <= 1.0


def test_score_result_with_underground_keywords():
    """Test scoring with underground keywords."""
    result = SearchResult(
        name="Authentic Local Dive",
        description="Underground indie venue",
        source="serp",
    )

    scored = scoring_service.score_result(result, "venues")

    assert scored.score > 0
    assert "underground" in result.description.lower()


def test_score_and_rank_results():
    """Test scoring and ranking multiple results."""
    results = [
        SearchResult(
            name="Tourist Trap",
            description="Popular mainstream attraction",
            source="serp",
        ),
        SearchResult(
            name="Hidden Underground Spot",
            description="Secret local hidden gem",
            source="reddit",
        ),
        SearchResult(
            name="Indie Venue",
            description="Alternative underground space",
            source="eventbrite",
        ),
    ]

    scored = scoring_service.score_and_rank_results(
        results, {"intent": "hidden gems", "location": "Portland"}
    )

    assert len(scored) == 3
    assert scored[0].score >= scored[1].score >= scored[2].score


def test_categorize_results():
    """Test result categorization into primary and nearby."""
    results = [
        SearchResult(name="High Score", description="test", source="reddit", score=0.8),
        SearchResult(name="Low Score", description="test", source="serp", score=0.3),
        SearchResult(name="Medium Score", description="test", source="eventbrite", score=0.6),
    ]

    categorized = scoring_service.categorize_results(results)

    assert len(categorized.primary) >= 1
    assert all(r.score >= 0.5 for r in categorized.primary)
    assert all(r.score < 0.5 for r in categorized.nearby)


def test_generate_scoring_summary():
    """Test scoring summary generation."""
    results = [
        SearchResult(name="A", description="test", source="reddit", score=0.8),
        SearchResult(name="B", description="test", source="serp", score=0.6),
        SearchResult(name="C", description="test", source="eventbrite", score=0.4),
    ]

    summary = scoring_service.generate_scoring_summary(results)

    assert summary.total_results == 3
    assert 0 < summary.average_score < 1
    assert summary.max_score == 0.8
    assert summary.min_score == 0.4


def test_generate_scoring_summary_empty():
    """Test scoring summary with no results."""
    summary = scoring_service.generate_scoring_summary([])

    assert summary.total_results == 0
    assert summary.average_score == 0.0
    assert summary.max_score == 0.0
    assert summary.min_score == 0.0
