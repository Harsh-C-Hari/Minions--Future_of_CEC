const { Router } = require('express');
const liftRequestController = require('../controllers/liftRequest.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadLiftDocument } = require('../middleware/upload.middleware');
const { createLiftRequestSchema, requestIdParamSchema } = require('../validations/liftRequest.validation');

const router = Router();

router.use(authenticate);

// multer runs first so req.body (text fields) and req.file are populated
// before Zod validation reads them.
router.post('/', uploadLiftDocument, validate(createLiftRequestSchema), liftRequestController.createRequest);
router.get('/me', liftRequestController.getOwnRequests);
router.get('/:id', validate(requestIdParamSchema), liftRequestController.getRequestById);

module.exports = router;
