import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type { EntryType } from '../../common/types';

export interface CreateLedgerEntryInput {
  transactionId: string;
  accountId: string;
  entryType: EntryType;
  amount: Decimal;
  balanceAfter: Decimal;
}

export class LedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEntry(
    input: CreateLedgerEntryInput,
    tx: Prisma.TransactionClient
  ) {
    return tx.ledgerEntry.create({
      data: {
        transactionId: input.transactionId,
        accountId: input.accountId,
        entryType: input.entryType,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
      },
    });
  }

  async getAccountHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        accountId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        transaction: true,
      },
    });
  }

  async countAccountEntries(accountId: string): Promise<number> {
    return this.prisma.ledgerEntry.count({
      where: {
        accountId,
      },
    });
  }

  async getTransactionEntries(transactionId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        transactionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
