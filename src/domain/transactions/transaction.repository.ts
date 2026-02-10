import { Prisma, PrismaClient } from '@prisma/client';
import type { TransactionType, TransactionStatus } from '../../common/types';

export interface CreateTransactionInput {
  idempotencyKey: string;
  transactionType: TransactionType;
  metadata?: Record<string, any>;
}

export class TransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createTransaction(
    input: CreateTransactionInput,
    tx: Prisma.TransactionClient
  ) {
    return tx.transaction.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        transactionType: input.transactionType,
        status: 'PENDING',
        metadata: input.metadata || {},
      },
    });
  }

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    tx: Prisma.TransactionClient
  ) {
    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      },
    });
  }

  async findById(transactionId: string) {
    return this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        ledgerEntries: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async findUserTransactions(
    userId: string,
    assetTypeCode?: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const query = `
      SELECT DISTINCT 
        t.id as transaction_id,
        t.transaction_type,
        le.entry_type,
        le.amount,
        le.balance_after,
        t.created_at,
        t.metadata
      FROM transactions t
      INNER JOIN ledger_entries le ON le.transaction_id = t.id
      INNER JOIN accounts a ON a.id = le.account_id
      INNER JOIN asset_types at ON at.id = a.asset_type_id
      WHERE a.owner_id = $1::uuid
        AND a.account_type = 'USER'
        ${assetTypeCode ? "AND at.code = $4" : ""}
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const params = assetTypeCode 
      ? [userId, limit, offset, assetTypeCode]
      : [userId, limit, offset];

    return this.prisma.$queryRawUnsafe(query, ...params);
  }

  async countUserTransactions(userId: string, assetTypeCode?: string): Promise<number> {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT t.id)::bigint as count
      FROM transactions t
      INNER JOIN ledger_entries le ON le.transaction_id = t.id
      INNER JOIN accounts a ON a.id = le.account_id
      INNER JOIN asset_types at ON at.id = a.asset_type_id
      WHERE a.owner_id = ${userId}::uuid
        AND a.account_type = 'USER'
        ${assetTypeCode ? Prisma.sql`AND at.code = ${assetTypeCode}` : Prisma.empty}
    `;

    return Number(result[0].count);
  }
}
