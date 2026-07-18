const prisma = require('../prisma/client');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notification.service');

const createLiftRequest = async (userId, { reason, medicalCondition, documentType, documentPath }) => {
  const request = await prisma.liftRequest.create({
    data: { userId, reason, medicalCondition, documentType, documentPath },
  });

  await notificationService.notify(
    userId,
    'REQUEST_SUBMITTED',
    'Lift request submitted',
    'Your lift request has been submitted and is pending review.',
    request.id
  );

  return request;
};

const getOwnRequests = async (userId) =>
  prisma.liftRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

const getRequestById = async (id, { userId, isAdmin }) => {
  const request = await prisma.liftRequest.findUnique({
    where: { id },
    include: {
      user: isAdmin ? { select: { id: true, name: true, email: true } } : false,
      liftAccess: true,
    },
  });

  if (!request) throw ApiError.notFound('Lift request not found');
  if (!isAdmin && request.userId !== userId) {
    throw ApiError.forbidden('You do not have access to this request');
  }

  return request;
};

const getAllRequests = async ({ status }) =>
  prisma.liftRequest.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

const approveRequest = async (id, adminId, remarks) => {
  const request = await prisma.liftRequest.findUnique({ where: { id } });
  if (!request) throw ApiError.notFound('Lift request not found');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending requests can be approved');
  }

  const [updatedRequest, liftAccess] = await prisma.$transaction([
    prisma.liftRequest.update({
      where: { id },
      data: { status: 'APPROVED', remarks, reviewedById: adminId, reviewedAt: new Date() },
    }),
    prisma.liftAccess.create({
      data: { liftRequestId: id, userId: request.userId, status: 'ACTIVE', activatedAt: new Date() },
    }),
  ]);

  await notificationService.notify(
    request.userId,
    'REQUEST_APPROVED',
    'Lift request approved',
    'Your lift request has been approved. You can now generate a PIN.',
    id
  );

  return { request: updatedRequest, liftAccess };
};

const rejectRequest = async (id, adminId, remarks) => {
  const request = await prisma.liftRequest.findUnique({ where: { id } });
  if (!request) throw ApiError.notFound('Lift request not found');
  if (request.status !== 'PENDING') {
    throw ApiError.badRequest('Only pending requests can be rejected');
  }

  const updated = await prisma.liftRequest.update({
    where: { id },
    data: { status: 'REJECTED', remarks, reviewedById: adminId, reviewedAt: new Date() },
  });

  await notificationService.notify(
    request.userId,
    'REQUEST_REJECTED',
    'Lift request rejected',
    remarks || 'Your lift request has been rejected.',
    id
  );

  return updated;
};

module.exports = {
  createLiftRequest,
  getOwnRequests,
  getRequestById,
  getAllRequests,
  approveRequest,
  rejectRequest,
};
