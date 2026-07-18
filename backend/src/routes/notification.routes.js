const { Router } = require('express');
const { z } = require('zod');
const notificationController = require('../controllers/notification.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');

const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid notification id') }),
});

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getOwnNotifications);
router.patch('/:id/read', validate(idParamSchema), notificationController.markRead);

module.exports = router;
