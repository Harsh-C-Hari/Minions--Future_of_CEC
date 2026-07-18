const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');
const { ensureLiftAccessFresh, getFreshActivePin } = require('./expiry.service');

const PIN_TTL_MS = 5 * 60 * 1000;

const generatePinCode = () => String(Math.floor(1000 + Math.random() * 9000));

const getOwnLiftAccess = async (userId) => {
  const access = await prisma.liftAccess.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { fingerprintEnrollment: true },
  });
  if (!access) return null;
  return ensureLiftAccessFresh(access);
};

const getOwnActivePin = async (userId) => {
  const access = await getOwnLiftAccess(userId);
  if (!access) throw ApiError.notFound('No lift access found. Submit a lift request first.');
  if (access.status !== 'ACTIVE') throw ApiError.badRequest('Lift access is not active');
  return getFreshActivePin(access.id);
};

/**
 * Creates a new PIN for a lift access. Enforces "only one active PIN" by
 * checking for a still-valid one first (regeneration is only allowed after
 * the previous PIN has expired or been used).
 */
const generatePinForAccess = async (liftAccess) => {
  const existing = await getFreshActivePin(liftAccess.id);
  if (existing) {
    throw ApiError.conflict('An active PIN already exists. Wait for it to expire before generating a new one.');
  }

  let pinCode;
  let collision;
  let attempts = 0;
  do {
    pinCode = generatePinCode();
    attempts += 1;
    // eslint-disable-next-line no-await-in-loop
    collision = await prisma.liftPin.findFirst({ where: { pin: pinCode, status: 'ACTIVE' } });
  } while (collision && attempts < 10);

  if (collision) throw ApiError.internal('Unable to generate a unique PIN. Please try again.');

  const pin = await prisma.liftPin.create({
    data: {
      liftAccessId: liftAccess.id,
      pin: pinCode,
      expiresAt: new Date(Date.now() + PIN_TTL_MS),
    },
  });

  await notificationService.notify(
    liftAccess.userId,
    'PIN_GENERATED',
    'Lift PIN generated',
    'A new lift PIN has been generated. It expires in 5 minutes.',
    liftAccess.liftRequestId
  );

  return pin;
};

const generateOwnPin = async (userId) => {
  const access = await getOwnLiftAccess(userId);
  if (!access) throw ApiError.notFound('No lift access found. Submit a lift request first.');
  if (access.status !== 'ACTIVE') throw ApiError.badRequest('Lift access is not active');
  return generatePinForAccess(access);
};

/**
 * Marks fingerprint enrollment success. Only success/failure + metadata is
 * stored here — the scanner/device owns the actual biometric template.
 * Consumes (invalidates) the current active PIN, per the workflow rule.
 */
const enrollFingerprint = async (userId, { deviceId }) => {
  const access = await getOwnLiftAccess(userId);
  if (!access) throw ApiError.notFound('No lift access found.');
  if (access.status !== 'ACTIVE') throw ApiError.badRequest('Lift access is not active');

  const activePin = await getFreshActivePin(access.id);
  if (!activePin) throw ApiError.badRequest('Generate a PIN before enrolling a fingerprint');

  const [, enrollment] = await prisma.$transaction([
    prisma.liftPin.update({ where: { id: activePin.id }, data: { status: 'USED', usedAt: new Date() } }),
    prisma.fingerprintEnrollment.upsert({
      where: { liftAccessId: access.id },
      update: { enrolled: true, enrolledAt: new Date(), deviceId },
      create: { liftAccessId: access.id, userId, enrolled: true, enrolledAt: new Date(), deviceId },
    }),
  ]);

  await notificationService.notify(
    userId,
    'FINGERPRINT_ENROLLED',
    'Fingerprint enrolled',
    'Your fingerprint has been enrolled. The lift is now ready to use.',
    access.liftRequestId
  );

  return enrollment;
};

const getAllActiveAccess = async () => {
  const list = await prisma.liftAccess.findMany({
    where: { status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      fingerprintEnrollment: true,
    },
    orderBy: { activatedAt: 'desc' },
  });
  return Promise.all(list.map(ensureLiftAccessFresh));
};

const revokeAccess = async (id, adminId, reason) => {
  const access = await prisma.liftAccess.findUnique({ where: { id } });
  if (!access) throw ApiError.notFound('Lift access not found');
  if (access.status !== 'ACTIVE') throw ApiError.badRequest('Only active lift access can be revoked');

  const updated = await prisma.liftAccess.update({
    where: { id },
    data: { status: 'REVOKED', revokedAt: new Date(), revokedById: adminId },
  });

  await notificationService.notify(
    access.userId,
    'LIFT_REVOKED',
    'Lift access revoked',
    reason || 'Your lift access has been revoked by an administrator.',
    access.liftRequestId
  );

  return updated;
};

/**
 * Admin override: force-expires any current active PIN, then issues a
 * fresh one immediately (unlike the student self-service path, which must
 * wait for natural expiry).
 */
const regeneratePin = async (id) => {
  const access = await prisma.liftAccess.findUnique({ where: { id } });
  if (!access) throw ApiError.notFound('Lift access not found');

  const fresh = await ensureLiftAccessFresh(access);
  if (fresh.status !== 'ACTIVE') throw ApiError.badRequest('Lift access is not active');

  await prisma.liftPin.updateMany({
    where: { liftAccessId: id, status: 'ACTIVE' },
    data: { status: 'EXPIRED' },
  });

  return generatePinForAccess(fresh);
};

module.exports = {
  getOwnLiftAccess,
  getOwnActivePin,
  generateOwnPin,
  enrollFingerprint,
  getAllActiveAccess,
  revokeAccess,
  regeneratePin,
};
