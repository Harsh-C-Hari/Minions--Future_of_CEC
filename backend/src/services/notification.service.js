const prisma = require('../prisma/client');

/**
 * Creates a notification for a user. Called from the lift-request /
 * lift-access services on every state transition (submitted, approved,
 * rejected, PIN generated, fingerprint enrolled, expired, revoked).
 */
const notify = async (userId, type, title, message, relatedLiftRequestId = null) =>
  prisma.notification.create({
    data: { userId, type, title, message, relatedLiftRequestId },
  });

const getOwnNotifications = async (userId) =>
  prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

const markRead = async (userId, id) => {
  const result = await prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
  return result.count > 0;
};

module.exports = { notify, getOwnNotifications, markRead };
