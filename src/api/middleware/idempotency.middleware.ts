import { FastifyRequest, FastifyReply } from 'fastify';
import { IdempotencyKeyRequiredError } from '../../common/errors';

export async function requireIdempotencyKey(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const idempotencyKey = request.headers['idempotency-key'] as string;

  if (!idempotencyKey || idempotencyKey.trim() === '') {
    throw new IdempotencyKeyRequiredError();
  }

  (request as any).idempotencyKey = idempotencyKey;
}
