const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const liftAccessService = require('../services/liftAccess.service');

const sanitizeAccess = (a) => ({
  id: a.id,
  status: a.status,
  activatedAt: a.activatedAt,
  expiresAt: a.expiresAt,
  revokedAt: a.revokedAt,
  enrollment: a.fingerprintEnrollment
    ? {
        enrolled: a.fingerprintEnrollment.enrolled,
        enrolledAt: a.fingerprintEnrollment.enrolledAt,
        deviceId: a.fingerprintEnrollment.deviceId,
      }
    : { enrolled: false, enrolledAt: null, deviceId: null },
  ...(a.user ? { student: { id: a.user.id, name: a.user.name, email: a.user.email } } : {}),
});

const sanitizePin = (p) =>
  p ? { pin: p.pin, status: p.status, generatedAt: p.generatedAt, expiresAt: p.expiresAt } : null;

// GET /api/v1/lift-access/me
const getOwnAccess = asyncHandler(async (req, res) => {
  const access = await liftAccessService.getOwnLiftAccess(req.user.id);
  res.status(200).json(new ApiResponse(200, access ? sanitizeAccess(access) : null, 'Lift access status'));
});

// GET /api/v1/lift-access/me/pin
const getOwnPin = asyncHandler(async (req, res) => {
  const pin = await liftAccessService.getOwnActivePin(req.user.id);
  res.status(200).json(new ApiResponse(200, sanitizePin(pin), pin ? 'Active PIN' : 'No active PIN'));
});

// POST /api/v1/lift-access/me/pin
const generateOwnPin = asyncHandler(async (req, res) => {
  const pin = await liftAccessService.generateOwnPin(req.user.id);
  res.status(201).json(new ApiResponse(201, sanitizePin(pin), 'PIN generated'));
});

// POST /api/v1/lift-access/me/fingerprint-enrollment
const enrollFingerprint = asyncHandler(async (req, res) => {
  const enrollment = await liftAccessService.enrollFingerprint(req.user.id, { deviceId: req.body.deviceId });
  res.status(200).json(
    new ApiResponse(
      200,
      { enrolled: enrollment.enrolled, enrolledAt: enrollment.enrolledAt, deviceId: enrollment.deviceId },
      'Fingerprint enrolled'
    )
  );
});

// GET /api/v1/admin/lift-access
const getActiveAccess = asyncHandler(async (req, res) => {
  const list = await liftAccessService.getAllActiveAccess();
  res.status(200).json(new ApiResponse(200, list.map(sanitizeAccess), 'Active lift users'));
});

// POST /api/v1/admin/lift-access/:id/revoke
const revokeAccess = asyncHandler(async (req, res) => {
  const access = await liftAccessService.revokeAccess(req.params.id, req.user.id, req.body.reason);
  res.status(200).json(new ApiResponse(200, sanitizeAccess(access), 'Lift access revoked'));
});

// POST /api/v1/admin/lift-access/:id/regenerate-pin
const regeneratePin = asyncHandler(async (req, res) => {
  const pin = await liftAccessService.regeneratePin(req.params.id);
  res.status(201).json(new ApiResponse(201, sanitizePin(pin), 'PIN regenerated'));
});

module.exports = {
  getOwnAccess,
  getOwnPin,
  generateOwnPin,
  enrollFingerprint,
  getActiveAccess,
  revokeAccess,
  regeneratePin,
};
