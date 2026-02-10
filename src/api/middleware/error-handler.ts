import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../../common/errors';

export async function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors,
    });
  }

  if ((error as any).code === 'P2002') {
    return reply.status(409).send({
      error: 'DUPLICATE_ENTRY',
      message: 'A record with this identifier already exists',
    });
  }

  if ((error as any).code === 'P2025') {
    return reply.status(404).send({
      error: 'NOT_FOUND',
      message: 'The requested resource was not found',
    });
  }

  return reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}
