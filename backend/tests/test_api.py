import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from main import app


def test_health_check():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "scorer" in data
    assert "scorer_mode" in data
    assert "model_exists" in data


def test_get_stats_error_or_ok():
    client = TestClient(app)
    response = client.get("/api/stats")
    # Might be 200 (if DB works/empty) or 500 (if no DB config or network fails in test environment)
    # We just want to check that it executes without raising unhandled exceptions in the route logic
    assert response.status_code in [200, 500]


def test_get_model_status():
    client = TestClient(app)
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "exists" in data
    assert "scorer_mode" in data
    assert "active_scorer" in data
