const prisma = require('../prisma/client');
const notificationService = require('./notification.service');

/**
 * Timestamp-driven expiry, evaluated on demand.
 *
 * There is no cron job or setInterval anywhere in this module. Every read
 * or write path that touches a LiftAccess or LiftPin calls one of these
 * first, so an expired-but-not-yet-marked row is always corrected before
 * it's used. This is the single seam to swap in a real scheduler later
 * (e.g. a periodic job calling these same functions in bulk) without
 * touching any controller or route.
 */

const ensureLiftAccessFresh = async (liftAccess) => {
  if (!liftAccess) return liftAccess;
  if (liftAccess.status === 'ACTIVE' && liftAccess.expiresAt && liftAccess.expiresAt < new Date()) {
    const updated = await prisma.liftAccess.update({
      where: { id: liftAccess.id },
      data: { status: 'EXPIRED' },
    });
    await notificationService.notify(
      liftAccess.userId,
      'LIFT_EXPIRED',
      'Lift access expired',
      'Your lift access has expired.',
      liftAccess.liftRequestId
    );
    return { ...liftAccess, ...updated };
  }
  return liftAccess;
};

const ensureLiftPinFresh = async (pin) => {
  if (!pin) return pin;
  if (pin.status === 'ACTIVE' && pin.expiresAt < new Date()) {
    return prisma.liftPin.update({ where: { id: pin.id }, data: { status: 'EXPIRED' } });
  }
  return pin;
};

/** Returns the current, freshly-evaluated active PIN for a lift access, or null. */
const getFreshActivePin = async (liftAccessId) => {
  const pin = await prisma.liftPin.findFirst({
    where: { liftAccessId, status: 'ACTIVE' },
    orderBy: { generatedAt: 'desc' },
  });
  const fresh = await ensureLiftPinFresh(pin);
  return fresh && fresh.status === 'ACTIVE' ? fresh : null;
};

module.exports = { ensureLiftAccessFresh, ensureLiftPinFresh, getFreshActivePin };
