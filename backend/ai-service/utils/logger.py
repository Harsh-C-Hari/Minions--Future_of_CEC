"""Logging configuration for CampusOne AI.

This module provides a reusable project-wide logger that writes to both
the console and a log file under the logs directory.
"""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


# Resolve the project root so the logs directory can be created consistently.
BASE_DIR = Path(__file__).resolve().parents[1]

# Store application logs in a dedicated directory under the project root.
LOGS_DIR = BASE_DIR / "logs"

# Use a single log file for the service and rotate it before it grows too large.
LOG_FILE_PATH = LOGS_DIR / "campusone_ai.log"

# Keep the default log format concise but still useful for debugging.
LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def ensure_logs_directory() -> Path:
	"""Create the logs directory if it does not already exist."""

	# The directory is created lazily so imports remain safe in all environments.
	LOGS_DIR.mkdir(parents=True, exist_ok=True)
	return LOGS_DIR


def build_file_handler() -> RotatingFileHandler:
	"""Create the file handler used to persist application logs."""

	# Ensure the logs directory exists before creating the file handler.
	ensure_logs_directory()
	file_handler = RotatingFileHandler(
		LOG_FILE_PATH,
		maxBytes=1_000_000,
		backupCount=5,
		encoding="utf-8",
	)
	file_handler.setLevel(logging.INFO)
	file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
	return file_handler


def build_console_handler() -> logging.StreamHandler:
	"""Create the console handler used to print logs to standard output."""

	# Console logs make local development and debugging easier.
	console_handler = logging.StreamHandler()
	console_handler.setLevel(logging.INFO)
	console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
	return console_handler


def get_logger(name: str = "campusone_ai") -> logging.Logger:
	"""Return a reusable logger configured for the CampusOne AI project."""

	# Reuse the same logger instance so handlers are not duplicated.
	logger = logging.getLogger(name)
	logger.setLevel(logging.INFO)

	# Prevent duplicate handlers when the logger is imported multiple times.
	if not logger.handlers:
		logger.addHandler(build_file_handler())
		logger.addHandler(build_console_handler())

	# Allow messages to flow to attached handlers without reaching the root logger.
	logger.propagate = False
	return logger


# Shared logger instance that other modules can import directly.
logger = get_logger()
