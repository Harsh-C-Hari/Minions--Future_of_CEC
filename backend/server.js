const app = require('./src/app');
const config = require('./src/config/env');
const prisma = require('./src/prisma/client');

const server = app.listen(config.port, () => {
  console.log(`🚀 Smart Campus API listening on port ${config.port} [${config.nodeEnv}]`);
});

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server closed, database disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
