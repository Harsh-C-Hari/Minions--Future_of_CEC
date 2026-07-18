"""Chat route definitions for CampusOne AI.

This module exposes the POST /chat endpoint and connects request
validation, service execution, and HTTP error handling.
"""

from fastapi import APIRouter, HTTPException, status

from models.chat_model import ChatRequest, ChatResponse
from services.gemma_service import (
	GemmaServiceConnectionError,
	GemmaServiceError,
	GemmaServiceResponseError,
	GemmaServiceTimeoutError,
	ask_gemma,
)


# Create the router used by the FastAPI application to register chat endpoints.
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post(
	"",
	response_model=ChatResponse,
	status_code=status.HTTP_200_OK,
	summary="Generate a chat response",
	description=(
		"Accepts a validated chat message, sends it to Gemma 4 through Ollama, "
		"and returns the model response."
	),
	responses={
		400: {"description": "Invalid request payload."},
		502: {"description": "Ollama returned an invalid or unexpected response."},
		503: {"description": "Unable to connect to Ollama."},
		504: {"description": "The Ollama request timed out."},
		500: {"description": "Unexpected server error."},
	},
)
def create_chat_response(request: ChatRequest) -> ChatResponse:
	"""Handle a chat request and return the generated assistant response.

	The endpoint keeps the HTTP layer thin: it validates input, calls the
	Gemma service, and translates service failures into proper status codes.
	"""

	# Extract the validated message from the incoming request body.
	user_message = request.message

	try:
		# Delegate model generation to the service layer.
		response_text = ask_gemma(user_message=user_message)
		# Return the successful API payload expected by the client.
		return ChatResponse(response=response_text, success=True)
	except GemmaServiceTimeoutError as exc:
		# Timeouts mean Ollama did not respond in time.
		raise HTTPException(
			status_code=status.HTTP_504_GATEWAY_TIMEOUT,
			detail=str(exc),
		) from exc
	except GemmaServiceConnectionError as exc:
		# Connection issues indicate the local Ollama server is unavailable.
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail=str(exc),
		) from exc
	except GemmaServiceResponseError as exc:
		# Unexpected or invalid Ollama responses are treated as bad gateway errors.
		raise HTTPException(
			status_code=status.HTTP_502_BAD_GATEWAY,
			detail=str(exc),
		) from exc
	except GemmaServiceError as exc:
		# Any other controlled service error is surfaced as a gateway failure.
		raise HTTPException(
			status_code=status.HTTP_502_BAD_GATEWAY,
			detail=str(exc),
		) from exc
	except Exception as exc:
		# Guard against any unexpected failures and return a generic server error.
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="An unexpected error occurred while processing the chat request.",
		) from exc
