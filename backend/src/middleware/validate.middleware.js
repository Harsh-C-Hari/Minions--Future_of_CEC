const ApiError = require('../utils/ApiError');

// Generic Zod validation middleware.
// Usage: validate(schema) where schema = z.object({ body, query, params })
// (see src/validations/*.validation.js for examples)
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    return next(ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors));
  }

  // Overwrite with the parsed & coerced values so downstream code can trust them
  req.body = result.data.body ?? req.body;
  req.query = result.data.query ?? req.query;
  req.params = result.data.params ?? req.params;

  next();
};

module.exports = validate;
