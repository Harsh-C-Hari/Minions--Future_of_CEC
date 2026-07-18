"""General-purpose helper utilities for CampusOne AI.

This module contains small reusable helpers that support the service,
route, and validation layers without coupling them together.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_text_file(file_path: str | Path, encoding: str = "utf-8") -> str:
	"""Load and return the contents of a text file.

	This helper keeps file reading consistent across the project and makes
	it easy to swap in different prompt or template files later.
	"""

	# Convert the input to a Path object so the helper accepts either strings or Paths.
	path = Path(file_path)
	# Read the file content and remove trailing whitespace to keep prompt text clean.
	return path.read_text(encoding=encoding).strip()


def clean_response(response_text: str) -> str:
	"""Normalize a model response before it is returned to the client.

	This helper trims whitespace, removes common code-fence wrappers, and
	returns a clean string that is safe to pass into the API layer.
	"""

	# Trim surrounding whitespace first so later checks work on a stable string.
	cleaned_text = response_text.strip()

	# Remove fenced JSON or text blocks that some models return by default.
	if cleaned_text.startswith("```") and cleaned_text.endswith("```"):
		lines = cleaned_text.splitlines()
		if len(lines) >= 3:
			cleaned_text = "\n".join(lines[1:-1]).strip()

	# Collapse repeated blank space around the final response.
	return cleaned_text


def validate_json_response(response_text: str) -> dict[str, Any]:
	"""Validate that a string contains a JSON object and return the parsed data.

	This helper is useful when the service expects the model to emit
	structured JSON for workflow detection or other machine-readable output.
	"""

	# Normalize the response before attempting to parse it as JSON.
	cleaned_text = clean_response(response_text)

	# Parse the JSON string and raise a clear error if the content is invalid.
	parsed_response = json.loads(cleaned_text)

	# Ensure the parsed payload is a JSON object, not a list or primitive value.
	if not isinstance(parsed_response, dict):
		raise ValueError("JSON response must be an object.")

	return parsed_response


def format_prompt(system_prompt: str, user_message: str) -> str:
	"""Combine the system prompt and user message into a single prompt string.

	This keeps prompt formatting consistent wherever a completion request
	needs to merge instruction text with user input.
	"""

	# Strip both inputs so the combined prompt stays predictable and readable.
	clean_system_prompt = system_prompt.strip()
	clean_user_message = user_message.strip()

	# Return a structured prompt that clearly separates instructions from user input.
	return (
		f"{clean_system_prompt}\n\n"
		f"User message:\n{clean_user_message}\n\n"
		"Assistant response:"
	)
