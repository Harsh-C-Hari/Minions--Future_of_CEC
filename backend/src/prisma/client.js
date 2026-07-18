const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance across the app (and across nodemon
// hot-reloads in development) to avoid exhausting the Postgres/Supabase
// connection pool.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
