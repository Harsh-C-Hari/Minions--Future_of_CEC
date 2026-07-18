"""Gemma 4 service integration for CampusOne AI.

This module reads the system prompt, builds the Ollama request payload,
sends the request to the local Gemma 4 endpoint, and returns the model
response in a reusable and testable way.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import logging
from pathlib import Path
from typing import Any

import requests

from config import settings


LOGGER = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parents[1]
SYSTEM_PROMPT_PATH = BASE_DIR / "prompts" / "system_prompt.txt"
OLLAMA_GENERATE_PATH = "/api/generate"
DEFAULT_TIMEOUT_SECONDS = 30.0


@dataclass(frozen=True)
class GemmaResponse:
	"""Structured response data returned from Ollama."""

	response_text: str
	raw_payload: dict[str, Any]


class GemmaServiceError(RuntimeError):
	"""Base exception raised when the Gemma service cannot complete a request."""


class GemmaServiceTimeoutError(GemmaServiceError):
	"""Raised when the Ollama request exceeds the configured timeout."""


class GemmaServiceConnectionError(GemmaServiceError):
	"""Raised when the Ollama server cannot be reached."""


class GemmaServiceResponseError(GemmaServiceError):
	"""Raised when Ollama returns an invalid or unexpected response."""


def load_system_prompt(prompt_path: Path = SYSTEM_PROMPT_PATH) -> str:
	"""Read and return the system prompt from disk.

	This keeps the prompt outside of code so it can be updated without
	changing the service implementation.
	"""

	try:
		return prompt_path.read_text(encoding="utf-8").strip()
	except OSError as exc:
		LOGGER.error("Failed to read system prompt from %s", prompt_path, exc_info=True)
		raise GemmaServiceError("Unable to load the system prompt.") from exc


def build_user_prompt(system_prompt: str, user_message: str) -> str:
	"""Combine the system prompt and the user message into a single prompt.

	Ollama's generate endpoint accepts a single prompt string, so this
	helper formats the instruction context and the user input together.
	"""

	return (
		f"{system_prompt}\n\n"
		f"User message:\n{user_message.strip()}\n\n"
		"Assistant response:"
	)


def build_generate_payload(prompt: str, model_name: str) -> dict[str, Any]:
	"""Build the JSON payload sent to Ollama's generate endpoint.

	Streaming is disabled because the service returns a single completed
	response to the caller.
	"""

	return {
		"model": model_name,
		"prompt": prompt,
		"stream": False,
	}


def build_ollama_url(base_url: str, path: str = OLLAMA_GENERATE_PATH) -> str:
	"""Create the full Ollama request URL from a base URL and endpoint path."""

	return f"{base_url.rstrip('/')}{path}"


def post_to_ollama(
	url: str,
	payload: dict[str, Any],
	timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> requests.Response:
	"""Send the request to Ollama and return the raw response object.

	This helper isolates network transport so it can be mocked in tests.
	"""

	try:
		return requests.post(url, json=payload, timeout=timeout_seconds)
	except requests.exceptions.Timeout as exc:
		LOGGER.error("Timed out calling Ollama at %s", url, exc_info=True)
		raise GemmaServiceTimeoutError("The Ollama request timed out.") from exc
	except requests.exceptions.ConnectionError as exc:
		LOGGER.error("Connection error calling Ollama at %s", url, exc_info=True)
		raise GemmaServiceConnectionError("Could not connect to Ollama.") from exc
	except requests.exceptions.RequestException as exc:
		LOGGER.error("Unexpected request error calling Ollama at %s", url, exc_info=True)
		raise GemmaServiceError("An unexpected error occurred while calling Ollama.") from exc


def parse_ollama_response(response: requests.Response) -> GemmaResponse:
	"""Parse and validate the JSON body returned by Ollama.

	The function extracts the generated text from the response field and
	raises a controlled exception if the JSON payload is invalid or missing
	the expected content.
	"""

	try:
		payload = response.json()
	except ValueError as exc:
		LOGGER.error("Ollama returned invalid JSON", exc_info=True)
		raise GemmaServiceResponseError("Ollama returned invalid JSON.") from exc

	if not isinstance(payload, dict):
		LOGGER.error("Ollama returned a non-object JSON payload: %s", type(payload).__name__)
		raise GemmaServiceResponseError("Ollama returned an unexpected response format.")

	response_text = payload.get("response")
	if not isinstance(response_text, str):
		LOGGER.error("Ollama response did not include a text response field: %s", payload)
		raise GemmaServiceResponseError("Ollama did not return a generated response.")

	return GemmaResponse(response_text=response_text.strip(), raw_payload=payload)


def validate_ollama_response_status(response: requests.Response) -> None:
	"""Convert HTTP error responses into a controlled service exception.

	This keeps callers from handling raw requests exceptions and ensures
	response failures are logged consistently in one place.
	"""

	try:
		response.raise_for_status()
	except requests.exceptions.HTTPError as exc:
		LOGGER.error(
			"Ollama returned HTTP %s for %s",
			response.status_code,
			response.url,
			exc_info=True,
		)
		raise GemmaServiceResponseError(
			f"Ollama returned HTTP {response.status_code}."
		) from exc


def generate_response(user_message: str, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> str:
	"""Generate a model response for a user message.

	This is the main service entry point used by the route layer. It loads
	the system prompt, builds the request, sends it to Ollama, and returns
	only the generated text.
	"""

	system_prompt = load_system_prompt()
	prompt = build_user_prompt(system_prompt=system_prompt, user_message=user_message)
	payload = build_generate_payload(prompt=prompt, model_name=settings.MODEL_NAME)
	url = build_ollama_url(settings.OLLAMA_URL)

	response = post_to_ollama(url=url, payload=payload, timeout_seconds=timeout_seconds)
	validate_ollama_response_status(response)

	parsed_response = parse_ollama_response(response)
	return parsed_response.response_text


def ask_gemma(user_message: str, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> str:
	"""Public service entry point for chat callers.

	This wrapper provides the exact function name expected by the route
	layer while keeping the actual implementation in generate_response().
	"""

	return generate_response(user_message=user_message, timeout_seconds=timeout_seconds)


def generate_response_with_metadata(user_message: str, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> GemmaResponse:
	"""Generate a model response and return both the text and raw payload.

	This helper is useful when callers need the full Ollama payload for
	diagnostics or future routing behavior.
	"""

	system_prompt = load_system_prompt()
	prompt = build_user_prompt(system_prompt=system_prompt, user_message=user_message)
	payload = build_generate_payload(prompt=prompt, model_name=settings.MODEL_NAME)
	url = build_ollama_url(settings.OLLAMA_URL)

	response = post_to_ollama(url=url, payload=payload, timeout_seconds=timeout_seconds)
	validate_ollama_response_status(response)

	return parse_ollama_response(response)


def safe_generate_response(user_message: str, timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS) -> str:
	"""Generate a response while guarding against unexpected failures.

	This helper preserves the controlled service exceptions defined in this
	module and converts any other unexpected exception into a service error.
	"""

	try:
		return generate_response(user_message=user_message, timeout_seconds=timeout_seconds)
	except GemmaServiceError:
		raise
	except Exception as exc:
		LOGGER.error("Unexpected error in Gemma service", exc_info=True)
		raise GemmaServiceError("An unexpected error occurred while generating the response.") from exc
