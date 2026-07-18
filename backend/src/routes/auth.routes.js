const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { googleLoginSchema, refreshTokenSchema } = require('../validations/auth.validation');

const router = Router();

router.post('/google', validate(googleLoginSchema), authController.googleLogin);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
