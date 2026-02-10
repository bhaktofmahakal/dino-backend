import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './api/middleware/error-handler';
import { transactionRoutes } from './api/routes/transactions.routes';
import { accountRoutes } from './api/routes/accounts.routes';
import { healthRoutes } from './api/routes/health.routes';

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
        : undefined,
  },
});

app.register(cors, {
  origin: true,
});

app.setErrorHandler(errorHandler);

app.get('/', async () => {
  return {
    name: 'Dino Wallet Service API',
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: {
      health: '/v1/health',
      transactions: '/v1/transactions',
      accounts: '/v1/accounts'
    }
  };
});

app.register(healthRoutes);
app.register(transactionRoutes);
app.register(accountRoutes);

const start = async () => {
  try {
    await connectDatabase();

    await app.listen({
      port: env.SERVER_PORT,
      host: '0.0.0.0',
    });

    console.log('');
    console.log('🚀 Wallet Service is running!');
    console.log(`📍 Server: http://localhost:${env.SERVER_PORT}`);
    console.log(`🏥 Health: http://localhost:${env.SERVER_PORT}/v1/health`);
    console.log('');
  } catch (error) {
    app.log.error(error);
    await disconnectDatabase();
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await app.close();
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start();
