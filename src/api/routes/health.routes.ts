import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/v1/health', async (request, reply) => {
    let dbStatus = 'disconnected';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      request.log.error({ err: error }, 'Database health check failed');
    }

    const isHealthy = dbStatus === 'connected';

    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  });
}
