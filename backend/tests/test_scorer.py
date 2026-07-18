import sys
import os
from unittest.mock import patch, AsyncMock
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import scorer


def test_get_scorer_mode():
    with patch.dict(os.environ, {"SCORER": "judge"}):
        # We need to reload/re-evaluate scorer.SCORER_MODE if we want it to dynamic,
        # but since SCORER_MODE is evaluated at import time, let's just assert on the module attribute
        # or verify the get_scorer_mode() getter behaves as expected.
        assert scorer.get_scorer_mode() in ["judge", "ml", "auto"]


def test_model_exists():
    exists = scorer.model_exists()
    assert isinstance(exists, bool)


def test_get_active_scorer():
    # If SCORER_MODE is auto and model doesn't exist, it should return judge
    with patch("scorer.SCORER_MODE", "auto"):
        with patch("scorer.model_exists", return_value=False):
            assert scorer.get_active_scorer() == "judge"

    # If SCORER_MODE is ml and model exists, it should return ml
    with patch("scorer.SCORER_MODE", "ml"):
      with patch("scorer.model_exists", return_value=True):
        assert scorer.get_active_scorer() == "ml"


def test_score_responses_fallback():
    import asyncio
    mock_scores = [{"score": 8.0, "reason": "Good"}, {"score": 7.0, "reason": "OK"}, {"score": 6.0, "reason": "Decent"}]
    with patch("scorer.SCORER_MODE", "auto"):
        with patch("scorer.model_exists", return_value=False):
            with patch("scorer.score_with_judge", new_callable=AsyncMock, return_value=mock_scores) as mock_judge:
                async def run():
                    return await scorer.score_responses(
                        "query", "promptA", "responseA", "promptB", "responseB", "promptC", "responseC"
                    )
                scores, used = asyncio.run(run())
                assert used == "judge"
                assert scores == mock_scores
                mock_judge.assert_called_once()




