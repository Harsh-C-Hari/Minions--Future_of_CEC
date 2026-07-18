const { Router } = require('express');
const liftAccessController = require('../controllers/liftAccess.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { enrollFingerprintSchema } = require('../validations/liftAccess.validation');

const router = Router();

router.use(authenticate);

router.get('/me', liftAccessController.getOwnAccess);
router.get('/me/pin', liftAccessController.getOwnPin);
router.post('/me/pin', liftAccessController.generateOwnPin);
router.post('/me/fingerprint-enrollment', validate(enrollFingerprintSchema), liftAccessController.enrollFingerprint);

module.exports = router;
