"""Central application configuration for CampusOne AI.

This module loads values from a local .env file and exposes a reusable
settings object that can be imported throughout the project.
"""

from dataclasses import dataclass
import os

from dotenv import load_dotenv


# Load environment variables from .env before reading any configuration values.
load_dotenv()


@dataclass(frozen=True)
class Settings:
	"""Application settings loaded from environment variables."""

	# Base URL for the local Ollama server that hosts Gemma 4.
	OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")

	# Name of the model to request from Ollama.
	MODEL_NAME: str = os.getenv("MODEL_NAME", "gemma4:e2b")

	# Port the FastAPI application should use when started.
	API_PORT: int = int(os.getenv("API_PORT", "8000"))

	# Enables debug-friendly behavior when set to a truthy value.
	DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").strip().lower() in {
		"1",
		"true",
		"yes",
		"on",
	}


# Shared settings instance that other modules can import and reuse.
settings = Settings()
