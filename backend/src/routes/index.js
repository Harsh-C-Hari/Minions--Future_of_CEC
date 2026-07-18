const { Router } = require('express');
const authRoutes = require('./auth.routes');
const aiRoutes = require('./ai.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);

// Future modules will mount here, unchanged by later work:
// router.use('/students', studentRoutes);
// router.use('/lift-requests', liftRequestRoutes);
// router.use('/lift-access', liftAccessRoutes);
// router.use('/admin', adminRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;
