import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerRepository, CreateLedgerEntryInput } from './ledger.repository';
import type { EntryType } from '../../common/types';

export class LedgerService {
  constructor(private readonly ledgerRepository: LedgerRepository) {}

  async recordDebit(
    transactionId: string,
    accountId: string,
    amount: Decimal,
    balanceAfter: Decimal,
    tx: Prisma.TransactionClient
  ) {
    const entry: CreateLedgerEntryInput = {
      transactionId,
      accountId,
      entryType: 'DEBIT' as EntryType,
      amount,
      balanceAfter,
    };

    return this.ledgerRepository.createEntry(entry, tx);
  }

  async recordCredit(
    transactionId: string,
    accountId: string,
    amount: Decimal,
    balanceAfter: Decimal,
    tx: Prisma.TransactionClient
  ) {
    const entry: CreateLedgerEntryInput = {
      transactionId,
      accountId,
      entryType: 'CREDIT' as EntryType,
      amount,
      balanceAfter,
    };

    return this.ledgerRepository.createEntry(entry, tx);
  }

  async getAccountHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    return this.ledgerRepository.getAccountHistory(accountId, limit, offset);
  }

  async getTransactionEntries(transactionId: string) {
    return this.ledgerRepository.getTransactionEntries(transactionId);
  }
}
