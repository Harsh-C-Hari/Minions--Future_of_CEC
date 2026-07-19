# Google Gemma Usage Proof

Model Used
- Gemma 4 e2b

Runtime
- Ollama

Evidence

1. AI assistant integrated into the CEC website.
2. Student Portal chatbot powered by Gemma.
3. Gemma model configured in backend/ai-service/config.py.
4. Dedicated Gemma service implementation in backend/ai-service/services/gemma_service.py.
5. Chatbot responses generated through the Express → FastAPI → Ollama → Gemma pipeline.
6. Ollama model list showing the locally installed Gemma model.