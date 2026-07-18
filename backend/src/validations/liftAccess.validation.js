const { z } = require('zod');

const accessIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid lift access id') }),
});

const enrollFingerprintSchema = z.object({
  body: z.object({
    deviceId: z.string().max(100, 'deviceId is too long').optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const revokeAccessSchema = z.object({
  body: z.object({
    reason: z.string().max(500, 'reason is too long').optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid lift access id') }),
});

module.exports = {
  accessIdParamSchema,
  enrollFingerprintSchema,
  revokeAccessSchema,
};
