"""Application entry point for CampusOne AI.

This module creates the FastAPI application, registers routes, enables
cross-origin access for the frontend, and exposes basic service endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes.chat import router as chat_router


# Create the main FastAPI application instance used by Uvicorn.
app = FastAPI(
	title="CampusOne AI",
	description="FastAPI microservice for the CampusOne AI assistant.",
	version="1.0.0",
)


# This service is called server-to-server by the Express backend
# (POST /api/v1/ai/chat), not directly by the browser. CORS is left open
# here to keep local development simple; lock this down (or keep the port
# unexposed/firewalled) in production since the Express layer is the only
# intended caller.
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# Register the chat router so /chat is available through the application.
app.include_router(chat_router)


@app.on_event("startup")
def on_startup() -> None:
	"""Run startup configuration when the application boots.

	This hook keeps startup behavior centralized and easy to expand later.
	"""

	# Read the shared settings so the app verifies configuration at startup.
	_ = settings.DEBUG_MODE


@app.get(
	"/",
	tags=["system"],
	summary="Root endpoint",
	description="Returns a basic status message for the CampusOne AI service.",
)
def root() -> dict[str, str]:
	"""Return a simple welcome message for basic service verification."""

	# Keep the root endpoint lightweight so it can be used as a quick check.
	return {"message": "CampusOne AI service is running."}


@app.get(
	"/health",
	tags=["system"],
	summary="Health check",
	description="Reports whether the API is ready to serve requests.",
)
def health_check() -> dict[str, str]:
	"""Return a health payload that orchestration and monitoring can consume."""

	# A small health response is enough for readiness and uptime checks.
	return {"status": "healthy"}
