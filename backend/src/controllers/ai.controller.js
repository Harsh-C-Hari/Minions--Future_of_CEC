const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const aiService = require('../services/ai.service');

// POST /api/v1/ai/chat
const chat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const result = await aiService.chatWithAssistant(message);

  res.status(200).json(new ApiResponse(200, result, 'AI response generated successfully'));
});

module.exports = { chat };
