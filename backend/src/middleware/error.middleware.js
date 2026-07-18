const config = require('../config/env');

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Centralized error handler. Every error passed to next(err) — including
// ApiError instances thrown from services/controllers — ends up here, so the
// client always gets back the same clean JSON error shape.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    statusCode = 409;
    message = `Duplicate value for field: ${err.meta?.target?.join(', ') || 'unknown'}`;
  }

  // Prisma "record not found" (e.g. update/delete on missing row)
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  // Zod errors that slipped through without the validate middleware
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.flatten().fieldErrors;
  }

  if (!config.isProduction && statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    details,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
