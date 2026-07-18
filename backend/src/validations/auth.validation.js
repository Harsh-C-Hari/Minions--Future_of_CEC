const { z } = require('zod');

const googleLoginSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'idToken is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'refreshToken is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = { googleLoginSchema, refreshTokenSchema };
