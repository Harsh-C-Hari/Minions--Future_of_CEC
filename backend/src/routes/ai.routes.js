const { Router } = require('express');
const aiController = require('../controllers/ai.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { chatSchema } = require('../validations/ai.validation');

const router = Router();

// Only logged-in students/staff can use the AI assistant.
router.post('/chat', authenticate, validate(chatSchema), aiController.chat);

module.exports = router;
