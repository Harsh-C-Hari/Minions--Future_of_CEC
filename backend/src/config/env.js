require('dotenv').config();
const { z } = require('zod');

// Validate process.env once at startup. If anything required is missing or
// malformed, the process exits immediately with a clear message instead of
// failing later with a confusing runtime error.
const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET is required (min 10 chars)'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET is required (min 10 chars)'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),

  ALLOWED_EMAIL_DOMAIN: z.string().default('ceconline.edu'),

  CORS_ORIGIN: z.string().default('*'),

  // Base URL of the internal ai-service (FastAPI + Gemma/Ollama), mounted under
  // this backend and proxied through /api/v1/ai/*.
  AI_SERVICE_URL: z.string().default('http://localhost:8000'),
  AI_SERVICE_TIMEOUT_MS: z.string().default('30000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  port: Number(env.PORT),
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
  },

  allowedEmailDomain: env.ALLOWED_EMAIL_DOMAIN,

  // Split "http://a,http://b" into ['http://a','http://b'] so the cors
  // middleware can match against multiple allowed frontend origins.
  corsOrigin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),

  aiService: {
    url: env.AI_SERVICE_URL,
    timeoutMs: Number(env.AI_SERVICE_TIMEOUT_MS),
  },
};
