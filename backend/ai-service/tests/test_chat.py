"""Tests for the CampusOne AI chat API.

This module validates the POST /chat endpoint behavior without calling
the real Ollama service by mocking the service layer.
"""

from fastapi.testclient import TestClient
import pytest

from app import app
from services.gemma_service import (
	GemmaServiceConnectionError,
	GemmaServiceTimeoutError,
)


# Create a reusable TestClient so each test can exercise the FastAPI app.
client = TestClient(app)


def test_chat_success(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Verify that a valid chat request returns a successful response."""

	# Replace the service call with a deterministic mock response.
	def mock_ask_gemma(user_message: str, timeout_seconds: float = 30.0) -> str:
		return "Hello from CampusOne AI."

	monkeypatch.setattr("routes.chat.ask_gemma", mock_ask_gemma)

	# Send a valid request payload and confirm the endpoint response.
	response = client.post("/chat", json={"message": "Hello"})

	assert response.status_code == 200
	assert response.json() == {
		"response": "Hello from CampusOne AI.",
		"success": True,
	}


def test_chat_invalid_request(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Verify that a request missing the required field is rejected."""

	# The route should never call the service when validation fails.
	def mock_ask_gemma(user_message: str, timeout_seconds: float = 30.0) -> str:
		raise AssertionError("ask_gemma should not be called for invalid input")

	monkeypatch.setattr("routes.chat.ask_gemma", mock_ask_gemma)

	# Send a payload that does not match the ChatRequest schema.
	response = client.post("/chat", json={"text": "Hello"})

	assert response.status_code == 422


def test_chat_ollama_offline(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Verify that an Ollama connection failure returns a service-unavailable error."""

	# Simulate the Ollama service being unavailable at the service layer.
	def mock_ask_gemma(user_message: str, timeout_seconds: float = 30.0) -> str:
		raise GemmaServiceConnectionError("Could not connect to Ollama.")

	monkeypatch.setattr("routes.chat.ask_gemma", mock_ask_gemma)

	# Submit a valid request and confirm the endpoint maps the error correctly.
	response = client.post("/chat", json={"message": "Hello"})

	assert response.status_code == 503
	assert response.json()["detail"] == "Could not connect to Ollama."


def test_chat_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Verify that a service timeout is converted into a gateway timeout error."""

	# Simulate an Ollama timeout without touching the real model endpoint.
	def mock_ask_gemma(user_message: str, timeout_seconds: float = 30.0) -> str:
		raise GemmaServiceTimeoutError("The Ollama request timed out.")

	monkeypatch.setattr("routes.chat.ask_gemma", mock_ask_gemma)

	# Submit a valid request and confirm the timeout status code is returned.
	response = client.post("/chat", json={"message": "Hello"})

	assert response.status_code == 504
	assert response.json()["detail"] == "The Ollama request timed out."


def test_chat_empty_message(monkeypatch: pytest.MonkeyPatch) -> None:
	"""Verify that an empty message fails request validation."""

	# The route should never reach the service layer when the message is empty.
	def mock_ask_gemma(user_message: str, timeout_seconds: float = 30.0) -> str:
		raise AssertionError("ask_gemma should not be called for an empty message")

	monkeypatch.setattr("routes.chat.ask_gemma", mock_ask_gemma)

	# Send an empty message and confirm FastAPI rejects the payload.
	response = client.post("/chat", json={"message": ""})

	assert response.status_code == 422
