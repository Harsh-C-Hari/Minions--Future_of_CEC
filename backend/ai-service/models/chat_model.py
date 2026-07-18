"""Chat data models for CampusOne AI.

This module defines the request and response schemas used by the chat
API and the service layer.
"""

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
	"""Incoming chat request payload from the client."""

	# The user's message that will be sent to the Gemma service.
	message: str = Field(..., min_length=1, max_length=4000)


class ChatResponse(BaseModel):
	"""Outgoing chat response payload returned to the client."""

	# The generated response text returned by the AI assistant.
	response: str = Field(..., min_length=1)

	# Indicates whether the request completed successfully.
	success: bool = Field(...)
