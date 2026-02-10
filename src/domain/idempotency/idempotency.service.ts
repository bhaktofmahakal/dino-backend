import { Prisma } from '@prisma/client';
import { DuplicateRequestError } from '../../common/errors';
import { IdempotencyRepository, CreateIdempotencyRecordInput } from './idempotency.repository';
import type { TransactionResponse } from '../../common/types';

export interface IdempotencyCheck {
  exists: boolean;
  response?: TransactionResponse;
  isPending?: boolean;
}

export class IdempotencyService {
  constructor(private readonly idempotencyRepository: IdempotencyRepository) { }

  async checkIdempotency(idempotencyKey: string): Promise<IdempotencyCheck> {
    const record = await this.idempotencyRepository.findByKey(idempotencyKey);

    if (!record) {
      return { exists: false };
    }

    if (record.transaction.status === 'PENDING') {
      throw new DuplicateRequestError(idempotencyKey);
    }

    return {
      exists: true,
      response: record.responsePayload as unknown as TransactionResponse,
      isPending: false,
    };
  }

  // Atomic check-and-set within transaction boundary
  async checkIdempotencyTx(
    idempotencyKey: string,
    tx: Prisma.TransactionClient
  ): Promise<IdempotencyCheck> {
    const record = await this.idempotencyRepository.findByKeyTx(idempotencyKey, tx);

    if (!record) {
      return { exists: false };
    }

    if (record.transaction.status === 'PENDING') {
      throw new DuplicateRequestError(idempotencyKey);
    }

    return {
      exists: true,
      response: record.responsePayload as unknown as TransactionResponse,
      isPending: false,
    };
  }

  async storeIdempotencyRecord(
    idempotencyKey: string,
    transactionId: string,
    responsePayload: any,
    ttlHours: number,
    tx: Prisma.TransactionClient
  ) {
    const input: CreateIdempotencyRecordInput = {
      idempotencyKey,
      transactionId,
      responsePayload,
      ttlHours,
    };

    return this.idempotencyRepository.createRecord(input, tx);
  }

  async cleanupExpiredRecords(): Promise<number> {
    return this.idempotencyRepository.deleteExpired();
  }
}
