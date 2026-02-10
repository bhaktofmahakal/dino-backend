import { Prisma, PrismaClient } from '@prisma/client';

export interface CreateIdempotencyRecordInput {
  idempotencyKey: string;
  transactionId: string;
  responsePayload: any;
  ttlHours: number;
}

export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async findByKey(idempotencyKey: string) {
    return this.prisma.idempotencyStore.findUnique({
      where: {
        idempotencyKey,
      },
      include: {
        transaction: true,
      },
    });
  }

  async findByKeyTx(idempotencyKey: string, tx: Prisma.TransactionClient) {
    return tx.idempotencyStore.findUnique({
      where: {
        idempotencyKey,
      },
      include: {
        transaction: true,
      },
    });
  }

  async createRecord(
    input: CreateIdempotencyRecordInput,
    tx: Prisma.TransactionClient
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + input.ttlHours);

    return tx.idempotencyStore.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        transactionId: input.transactionId,
        responsePayload: input.responsePayload,
        expiresAt,
      },
    });
  }

  async deleteExpired() {
    const result = await this.prisma.idempotencyStore.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
