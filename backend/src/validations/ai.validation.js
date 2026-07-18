const { z } = require('zod');

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'message is required').max(4000, 'message is too long'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = { chatSchema };
