import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AccountRepository } from '../accounts/account.repository';
import { AccountService } from '../accounts/account.service';
import { LedgerService } from '../ledger/ledger.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { TransactionRepository } from './transaction.repository';
import { ConcurrencyError, InvalidTransactionError } from '../../common/errors';
import type {
  TopUpRequest,
  BonusRequest,
  SpendRequest,
  TransactionResponse,
  TransactionType,
} from '../../common/types';

// Orchestrates transactions with ACID guarantees: REPEATABLE READ + SELECT FOR UPDATE locks
export class TransactionOrchestrator {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 100;
  private static readonly MAX_DELAY_MS = 2000;

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly accountService: AccountService,
    private readonly ledgerService: LedgerService,
    private readonly idempotencyService: IdempotencyService,
    private readonly transactionRepository: TransactionRepository
  ) { }

  async executeTopUp(
    request: TopUpRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.executeTransaction(
      'TOP_UP',
      request,
      idempotencyKey,
      'TREASURY',
      async (tx, amount, userAccount, systemAccount, transactionId) => {
        // Treasury accounts bypass balance checks
        const newSystemBalance = new Decimal(systemAccount.balance).minus(amount);
        const newUserBalance = new Decimal(userAccount.balance).plus(amount);

        await this.ledgerService.recordDebit(
          transactionId,
          systemAccount.id,
          amount,
          newSystemBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          systemAccount.id,
          newSystemBalance,
          systemAccount.version,
          tx
        );

        await this.ledgerService.recordCredit(
          transactionId,
          userAccount.id,
          amount,
          newUserBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          userAccount.id,
          newUserBalance,
          userAccount.version,
          tx
        );

        return newUserBalance;
      }
    );
  }

  async executeBonus(
    request: BonusRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.executeTransaction(
      'BONUS',
      request,
      idempotencyKey,
      'BONUS_POOL',
      async (tx, amount, userAccount, systemAccount, transactionId) => {
        // Bonus pools are unlimited
        const newSystemBalance = new Decimal(systemAccount.balance).minus(amount);
        const newUserBalance = new Decimal(userAccount.balance).plus(amount);

        await this.ledgerService.recordDebit(
          transactionId,
          systemAccount.id,
          amount,
          newSystemBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          systemAccount.id,
          newSystemBalance,
          systemAccount.version,
          tx
        );

        await this.ledgerService.recordCredit(
          transactionId,
          userAccount.id,
          amount,
          newUserBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          userAccount.id,
          newUserBalance,
          userAccount.version,
          tx
        );

        return newUserBalance;
      }
    );
  }

  async executeSpend(
    request: SpendRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.executeTransaction(
      'SPEND',
      request,
      idempotencyKey,
      'REVENUE',
      async (tx, amount, userAccount, systemAccount, transactionId) => {
        // Re-validate using locked data to eliminate TOCTOU risks
        this.accountService.validateSufficientBalance(userAccount, amount);

        const newUserBalance = new Decimal(userAccount.balance).minus(amount);
        const newSystemBalance = new Decimal(systemAccount.balance).plus(amount);

        await this.ledgerService.recordDebit(
          transactionId,
          userAccount.id,
          amount,
          newUserBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          userAccount.id,
          newUserBalance,
          userAccount.version,
          tx
        );

        await this.ledgerService.recordCredit(
          transactionId,
          systemAccount.id,
          amount,
          newSystemBalance,
          tx
        );
        await this.accountRepository.updateBalance(
          systemAccount.id,
          newSystemBalance,
          systemAccount.version,
          tx
        );

        return newUserBalance;
      }
    );
  }

  private async executeTransaction(
    transactionType: TransactionType,
    request: TopUpRequest | BonusRequest | SpendRequest,
    idempotencyKey: string,
    systemRole: 'TREASURY' | 'BONUS_POOL' | 'REVENUE',
    operation: (
      tx: Prisma.TransactionClient,
      amount: Decimal,
      userAccount: any,
      systemAccount: any,
      transactionId: string
    ) => Promise<Decimal>
  ): Promise<TransactionResponse> {
    const amount = new Decimal(request.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new InvalidTransactionError('Amount must be greater than 0');
    }

    return this.withRetry(async () => {
      return prisma.$transaction(
        async (tx) => {
          // Idempotency check inside transaction boundary
          const idempotencyCheck = await this.idempotencyService.checkIdempotencyTx(
            idempotencyKey,
            tx
          );
          if (idempotencyCheck.exists && idempotencyCheck.response) {
            return idempotencyCheck.response;
          }

          const transactionRecord = await this.transactionRepository.createTransaction(
            {
              idempotencyKey,
              transactionType,
              metadata: request.metadata,
            },
            tx
          );

          const userAccountId = await this.accountRepository.resolveUserAccountId(
            request.userId,
            request.assetTypeCode,
            tx
          );
          const systemAccountId = await this.accountRepository.resolveSystemAccountId(
            systemRole,
            request.assetTypeCode,
            tx
          );

          // Lock ordering by ID prevents deadlocks
          const lockedAccounts = await this.accountRepository.lockAccountsInOrder(
            [userAccountId, systemAccountId],
            tx
          );
          const userAccount = lockedAccounts.find((a) => a.id === userAccountId)!;
          const systemAccount = lockedAccounts.find((a) => a.id === systemAccountId)!;

          const newUserBalance = await operation(
            tx,
            amount,
            userAccount,
            systemAccount,
            transactionRecord.id
          );

          await this.transactionRepository.updateStatus(
            transactionRecord.id,
            'COMPLETED',
            tx
          );

          const responsePayload: TransactionResponse = {
            transactionId: transactionRecord.id,
            status: 'COMPLETED',
            userId: request.userId,
            assetTypeCode: request.assetTypeCode,
            amount: amount.toString(),
            newBalance: newUserBalance.toString(),
            createdAt: transactionRecord.createdAt,
            completedAt: new Date(),
            metadata: request.metadata,
          };

          await this.idempotencyService.storeIdempotencyRecord(
            idempotencyKey,
            transactionRecord.id,
            responsePayload,
            env.IDEMPOTENCY_TTL_HOURS,
            tx
          );

          return responsePayload;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
          maxWait: 5000,
          timeout: 10000,
        }
      );
    });
  }

  // Retry logic handles serialization failures and deadlock victims
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= TransactionOrchestrator.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        const isRetryable = this.isRetryableError(error);
        const isLastAttempt = attempt === TransactionOrchestrator.MAX_RETRIES;

        if (!isRetryable || isLastAttempt) {
          if (error.code === 'P2034' && !(error instanceof ConcurrencyError)) {
            throw new ConcurrencyError();
          }
          throw error;
        }

        const delay = Math.min(
          TransactionOrchestrator.BASE_DELAY_MS * Math.pow(2, attempt) +
          Math.random() * 50,
          TransactionOrchestrator.MAX_DELAY_MS
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    if (error.code === 'P2034') return true; // Prisma conflict
    if (error.code === '40001') return true; // PG serialization failure
    if (error.code === '40P01') return true; // PG deadlock
    if (
      error.code === 'P2002' &&
      error.meta?.target?.includes('idempotency_key')
    ) {
      return true; // Concurrent duplicate request
    }
    return false;
  }
}
