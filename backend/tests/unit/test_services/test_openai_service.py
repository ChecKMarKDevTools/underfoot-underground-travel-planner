"""Unit tests for OpenAI service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.services import openai_service
from src.models.domain_models import ParsedInput


@pytest.mark.asyncio
async def test_parse_user_input_success():
    """Test successful user input parsing with OpenAI."""
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(
                content='{"location": "Pikeville, KY", "intent": "hidden gems"}'
            )
        )
    ]

    with patch.object(openai_service.client.chat.completions, 'create', new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response

        result = await openai_service.parse_user_input("hidden gems in Pikeville KY")

        assert result.location == "Pikeville, KY"
        assert result.intent == "hidden gems"
        assert result.confidence == 0.8
        mock_create.assert_called_once()


@pytest.mark.asyncio
async def test_parse_user_input_fallback():
    """Test fallback parsing when OpenAI fails."""
    with patch.object(openai_service.client.chat.completions, 'create', new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = Exception("API error")

        result = await openai_service.parse_user_input("hidden gems in Pikeville KY")

        assert "Pikeville" in result.location
        assert result.confidence < 0.8


@pytest.mark.asyncio
async def test_generate_response_success():
    """Test successful response generation with OpenAI."""
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(
            message=MagicMock(
                content="The paths of Pikeville reveal hidden treasures. Venture forth with curiosity."
            )
        )
    ]

    with patch.object(openai_service.client.chat.completions, 'create', new_callable=AsyncMock) as mock_create:
        mock_create.return_value = mock_response

        places = [
            {"name": "Secret Cave", "description": "A mysterious underground cavern"}
        ]
        summary = {"total_results": 1, "average_score": 0.8}

        result = await openai_service.generate_response(
            "hidden gems", "Pikeville, KY", places, summary
        )

        assert "Pikeville" in result
        assert len(result) > 0
        mock_create.assert_called_once()


@pytest.mark.asyncio
async def test_generate_response_fallback():
    """Test fallback response when OpenAI fails."""
    with patch.object(openai_service.client.chat.completions, 'create', new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = Exception("API error")

        places = [{"name": "Test Place", "description": "Test description"}]
        summary = {"total_results": 1, "average_score": 0.5}

        result = await openai_service.generate_response(
            "hidden gems", "Pikeville, KY", places, summary
        )

        assert "Pikeville" in result
        assert "hidden gems" in result
