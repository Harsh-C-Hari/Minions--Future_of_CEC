const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../prisma/client');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the JWT access token sent in the Authorization header and
// attaches the authenticated user to req.user. Any downstream route can
// then read req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token); // throws JsonWebTokenError / TokenExpiredError -> handled globally

  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('User no longer exists or is inactive');
  }

  req.user = user;
  next();
});

// Role-based access guard, used after `authenticate`.
// Usage: router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentication required');
  }
  if (!roles.includes(req.user.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
  next();
};

module.exports = { authenticate, authorize };
