# CampusOne AI (bundled ai-service)

FastAPI microservice for the CampusOne AI assistant, backed by Gemma via Ollama.

This service now lives **inside** `smart-campus-backend/ai-service` and is not
called by the frontend directly. The main Express API proxies requests to it
through `POST /api/v1/ai/chat` (see `src/routes/ai.routes.js` and
`src/services/ai.service.js` in the parent backend). Keeping it as its own
Python process means the Node backend doesn't need a Python runtime embedded
in it — it just forwards authenticated chat requests over HTTP.

## Purpose

This project provides a local AI service backed by Gemma through Ollama.

## Project Structure

- `app.py` - Application entry point.
- `config.py` - Environment and application configuration.
- `prompts/system_prompt.txt` - System prompt placeholder.
- `services/gemma_service.py` - Ollama/Gemma service integration placeholder.
- `routes/chat.py` - Chat route definitions placeholder.
- `models/chat_model.py` - Request and response model definitions placeholder.
- `utils/helper.py` - Shared utility helpers placeholder.
- `utils/logger.py` - Logging setup placeholder.
- `tests/test_chat.py` - API test scaffold placeholder.

## Notes

- Implementation logic is intentionally omitted.
- Populate `.env` from `.env.example` during local development.
