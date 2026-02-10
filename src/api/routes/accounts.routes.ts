import { FastifyInstance } from 'fastify';
import { container } from '../../container';

export async function accountRoutes(app: FastifyInstance) {
  app.get('/v1/accounts/:userId/balances', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const result = await container.accountService.getUserBalances(userId);

    return reply.status(200).send(result);
  });
}
