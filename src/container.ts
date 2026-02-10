import { prisma } from './config/database';
import { AccountRepository } from './domain/accounts/account.repository';
import { AccountService } from './domain/accounts/account.service';
import { LedgerRepository } from './domain/ledger/ledger.repository';
import { LedgerService } from './domain/ledger/ledger.service';
import { IdempotencyRepository } from './domain/idempotency/idempotency.repository';
import { IdempotencyService } from './domain/idempotency/idempotency.service';
import { TransactionRepository } from './domain/transactions/transaction.repository';
import { TransactionOrchestrator } from './domain/transactions/transaction-orchestrator';
import { TransactionService } from './domain/transactions/transaction.service';

export class Container {
  private static instance: Container;

  public readonly accountRepository: AccountRepository;
  public readonly accountService: AccountService;
  public readonly ledgerRepository: LedgerRepository;
  public readonly ledgerService: LedgerService;
  public readonly idempotencyRepository: IdempotencyRepository;
  public readonly idempotencyService: IdempotencyService;
  public readonly transactionRepository: TransactionRepository;
  public readonly transactionOrchestrator: TransactionOrchestrator;
  public readonly transactionService: TransactionService;

  private constructor() {
    this.accountRepository = new AccountRepository(prisma);
    this.accountService = new AccountService(this.accountRepository);

    this.ledgerRepository = new LedgerRepository(prisma);
    this.ledgerService = new LedgerService(this.ledgerRepository);

    this.idempotencyRepository = new IdempotencyRepository(prisma);
    this.idempotencyService = new IdempotencyService(this.idempotencyRepository);

    this.transactionRepository = new TransactionRepository(prisma);
    this.transactionOrchestrator = new TransactionOrchestrator(
      this.accountRepository,
      this.accountService,
      this.ledgerService,
      this.idempotencyService,
      this.transactionRepository
    );

    this.transactionService = new TransactionService(
      this.transactionOrchestrator,
      this.transactionRepository,
      this.accountRepository,
      this.ledgerRepository
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

export const container = Container.getInstance();
