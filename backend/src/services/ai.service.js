const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Proxies a chat message to the internal ai-service (FastAPI + Gemma via
 * Ollama), which is mounted at backend/ai-service and run as its own
 * process. Keeping it as a separate Python process (instead of rewriting
 * the model-calling logic in Node) means the AI code, its Python deps, and
 * the Ollama integration stay untouched — this layer just forwards the
 * request and translates errors into the same ApiError shape the rest of
 * the API uses.
 */
const chatWithAssistant = async (message) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.aiService.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.aiService.url.replace(/\/+$/, '')}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(504, 'The AI assistant took too long to respond. Please try again.');
    }
    throw new ApiError(503, 'The AI assistant is currently unavailable. Please try again shortly.');
  } finally {
    clearTimeout(timeout);
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError(502, 'The AI assistant returned an invalid response.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.detail || 'The AI assistant returned an error.');
  }

  return { response: data.response, success: true };
};

module.exports = { chatWithAssistant };
