import { FastifyInstance } from 'fastify';
import { container } from '../../container';
import { requireIdempotencyKey } from '../middleware/idempotency.middleware';
import {
  topUpRequestSchema,
  bonusRequestSchema,
  spendRequestSchema,
  transactionHistoryQuerySchema,
} from '../schemas/transaction.schema';

export async function transactionRoutes(app: FastifyInstance) {
  app.post(
    '/v1/transactions/top-up',
    { preHandler: requireIdempotencyKey },
    async (request, reply) => {
      const body = topUpRequestSchema.parse(request.body);
      const idempotencyKey = (request as any).idempotencyKey;

      const result = await container.transactionService.executeTopUp(body, idempotencyKey);

      return reply.status(200).send(result);
    }
  );

  app.post(
    '/v1/transactions/bonus',
    { preHandler: requireIdempotencyKey },
    async (request, reply) => {
      const body = bonusRequestSchema.parse(request.body);
      const idempotencyKey = (request as any).idempotencyKey;

      const result = await container.transactionService.executeBonus(body, idempotencyKey);

      return reply.status(200).send(result);
    }
  );

  app.post(
    '/v1/transactions/spend',
    { preHandler: requireIdempotencyKey },
    async (request, reply) => {
      const body = spendRequestSchema.parse(request.body);
      const idempotencyKey = (request as any).idempotencyKey;

      const result = await container.transactionService.executeSpend(body, idempotencyKey);

      return reply.status(200).send(result);
    }
  );

  app.get('/v1/transactions/:transactionId', async (request, reply) => {
    const { transactionId } = request.params as { transactionId: string };

    const result = await container.transactionService.getTransactionDetail(transactionId);

    if (!result) {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Transaction not found',
      });
    }

    return reply.status(200).send(result);
  });

  app.get('/v1/accounts/:userId/transactions', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const query = transactionHistoryQuerySchema.parse(request.query);

    const result = await container.transactionService.getUserTransactionHistory(
      userId,
      query.assetTypeCode,
      query.limit,
      query.offset
    );

    return reply.status(200).send(result);
  });
}
