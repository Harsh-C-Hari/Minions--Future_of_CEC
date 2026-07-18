// Wraps async route handlers / middleware so a rejected promise (thrown
// ApiError, Prisma error, etc.) is forwarded to Express's error-handling
// middleware instead of crashing the process or hanging the request.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
