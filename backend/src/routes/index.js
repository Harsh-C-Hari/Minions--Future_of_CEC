const { Router } = require('express');
const authRoutes = require('./auth.routes');
const aiRoutes = require('./ai.routes');
const liftRequestRoutes = require('./liftRequest.routes');
const liftAccessRoutes = require('./liftAccess.routes');
const adminRoutes = require('./admin.routes');
const notificationRoutes = require('./notification.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);

// Automated Lift Management System (additive; auth/ai routes above are untouched)
router.use('/lift-requests', liftRequestRoutes);
router.use('/lift-access', liftAccessRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
