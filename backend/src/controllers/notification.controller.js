const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const notificationService = require('../services/notification.service');

// GET /api/v1/notifications
const getOwnNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getOwnNotifications(req.user.id);
  res.status(200).json(new ApiResponse(200, notifications, 'Notifications'));
});

// PATCH /api/v1/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const updated = await notificationService.markRead(req.user.id, req.params.id);
  if (!updated) {
    return res.status(404).json(new ApiResponse(404, null, 'Notification not found'));
  }
  res.status(200).json(new ApiResponse(200, null, 'Notification marked as read'));
});

module.exports = { getOwnNotifications, markRead };
