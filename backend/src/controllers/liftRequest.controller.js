const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const path = require('path');
const liftRequestService = require('../services/liftRequest.service');
const { SUBDIRS, UPLOAD_ROOT } = require('../middleware/upload.middleware');

const sanitizeRequest = (r, { includeUser = false } = {}) => ({
  id: r.id,
  reason: r.reason,
  medicalCondition: r.medicalCondition,
  requestedExpiryAt: r.requestedExpiryAt,
  documentType: r.documentType,
  documentPath: r.documentPath,
  status: r.status,
  remarks: r.remarks,
  reviewedAt: r.reviewedAt,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  ...(includeUser && r.user ? { student: { id: r.user.id, name: r.user.name, email: r.user.email } } : {}),
});

// POST /api/v1/lift-requests
const createRequest = asyncHandler(async (req, res) => {
  const { reason, medicalCondition, documentType, requestedExpiryAt } = req.body;
  const resolvedType = req.file ? documentType || 'SUPPORTING' : undefined;
  const documentPath = req.file ? `${SUBDIRS[resolvedType]}/${req.file.filename}` : null;

  const request = await liftRequestService.createLiftRequest(req.user.id, {
    reason,
    medicalCondition,
    documentType: resolvedType,
    documentPath,
    requestedExpiryAt,
  });

  res.status(201).json(new ApiResponse(201, sanitizeRequest(request), 'Lift request submitted'));
});

// GET /api/v1/lift-requests/me
const getOwnRequests = asyncHandler(async (req, res) => {
  const requests = await liftRequestService.getOwnRequests(req.user.id);
  res.status(200).json(new ApiResponse(200, requests.map((r) => sanitizeRequest(r)), 'Lift requests'));
});

// GET /api/v1/lift-requests/:id
const getRequestById = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  const request = await liftRequestService.getRequestById(req.params.id, { userId: req.user.id, isAdmin });
  res.status(200).json(new ApiResponse(200, sanitizeRequest(request, { includeUser: isAdmin }), 'Lift request'));
});

// GET /api/v1/admin/lift-requests
const getAllRequests = asyncHandler(async (req, res) => {
  const requests = await liftRequestService.getAllRequests({ status: req.query.status });
  res
    .status(200)
    .json(new ApiResponse(200, requests.map((r) => sanitizeRequest(r, { includeUser: true })), 'All lift requests'));
});

// POST /api/v1/admin/lift-requests/:id/approve
const approveRequest = asyncHandler(async (req, res) => {
  const { request, liftAccess } = await liftRequestService.approveRequest(req.params.id, req.user.id, req.body.remarks);
  res
    .status(200)
    .json(new ApiResponse(200, { request: sanitizeRequest(request), liftAccessId: liftAccess.id }, 'Lift request approved'));
});

// POST /api/v1/admin/lift-requests/:id/reject
const rejectRequest = asyncHandler(async (req, res) => {
  const request = await liftRequestService.rejectRequest(req.params.id, req.user.id, req.body.remarks);
  res.status(200).json(new ApiResponse(200, sanitizeRequest(request), 'Lift request rejected'));
});

// GET /api/v1/admin/lift-requests/:id/document
// Admin-only (route is mounted under admin.routes.js, which already applies
// authenticate + authorize('ADMIN')). Reuses getRequestById (isAdmin: true)
// rather than a new lookup — same 404 behaviour as the JSON detail endpoint.
const downloadDocument = asyncHandler(async (req, res, next) => {
  const request = await liftRequestService.getRequestById(req.params.id, { userId: req.user.id, isAdmin: true });
  if (!request.documentPath) {
    throw ApiError.notFound('This request has no supporting document.');
  }

  const absolutePath = path.join(UPLOAD_ROOT, request.documentPath);
  const downloadName =
    (request.documentType === 'MEDICAL' ? 'medical-certificate' : 'supporting-document') + path.extname(absolutePath);

  res.download(absolutePath, downloadName, (err) => {
    // multer/express's res.download uses a callback for errors (e.g. file
    // missing on disk) instead of rejecting a promise, so asyncHandler's
    // .catch(next) won't see it — forward it to the error middleware here.
    if (err && !res.headersSent) next(ApiError.notFound('Document file not found.'));
  });
});

module.exports = {
  createRequest,
  getOwnRequests,
  getRequestById,
  getAllRequests,
  approveRequest,
  rejectRequest,
  downloadDocument,
};
