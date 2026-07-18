const { z } = require('zod');

const createLiftRequestSchema = z.object({
  body: z.object({
    reason: z.string().min(1, 'reason is required').max(1000, 'reason is too long'),
    medicalCondition: z.string().max(1000, 'medicalCondition is too long').optional(),
    // Only meaningful when a file is attached; determines which upload
    // subdirectory (medical/ or documents/) the file was written to.
    documentType: z.enum(['MEDICAL', 'SUPPORTING']).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const requestIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid request id') }),
});

const reviewRequestSchema = z.object({
  body: z.object({
    remarks: z.string().max(500, 'remarks is too long').optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid request id') }),
});

const listRequestsQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
  params: z.object({}).optional(),
});

module.exports = {
  createLiftRequestSchema,
  requestIdParamSchema,
  reviewRequestSchema,
  listRequestsQuerySchema,
};
