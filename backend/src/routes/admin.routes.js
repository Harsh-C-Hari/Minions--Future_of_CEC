const { Router } = require('express');
const liftRequestController = require('../controllers/liftRequest.controller');
const liftAccessController = require('../controllers/liftAccess.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const {
  reviewRequestSchema,
  listRequestsQuerySchema,
} = require('../validations/liftRequest.validation');
const { accessIdParamSchema, revokeAccessSchema } = require('../validations/liftAccess.validation');

const router = Router();

// Every route below requires an authenticated admin. Students never reach
// these handlers — authorize('ADMIN') rejects them with 403 first.
router.use(authenticate, authorize('ADMIN'));

router.get('/lift-requests', validate(listRequestsQuerySchema), liftRequestController.getAllRequests);
router.post('/lift-requests/:id/approve', validate(reviewRequestSchema), liftRequestController.approveRequest);
router.post('/lift-requests/:id/reject', validate(reviewRequestSchema), liftRequestController.rejectRequest);

router.get('/lift-access', liftAccessController.getActiveAccess);
router.post('/lift-access/:id/revoke', validate(revokeAccessSchema), liftAccessController.revokeAccess);
router.post('/lift-access/:id/regenerate-pin', validate(accessIdParamSchema), liftAccessController.regeneratePin);

module.exports = router;
