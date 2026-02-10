import { TransactionOrchestrator } from './transaction-orchestrator';
import { TransactionRepository } from './transaction.repository';
import { AccountRepository } from '../accounts/account.repository';
import { LedgerRepository } from '../ledger/ledger.repository';
import type { 
  TopUpRequest, 
  BonusRequest, 
  SpendRequest,
  TransactionResponse,
  TransactionHistoryResponse,
  TransactionDetail
} from '../../common/types';

export class TransactionService {
  constructor(
    private readonly orchestrator: TransactionOrchestrator,
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly ledgerRepository: LedgerRepository
  ) {}

  async executeTopUp(
    request: TopUpRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.orchestrator.executeTopUp(request, idempotencyKey);
  }

  async executeBonus(
    request: BonusRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.orchestrator.executeBonus(request, idempotencyKey);
  }

  async executeSpend(
    request: SpendRequest,
    idempotencyKey: string
  ): Promise<TransactionResponse> {
    return this.orchestrator.executeSpend(request, idempotencyKey);
  }

  async getUserTransactionHistory(
    userId: string,
    assetTypeCode?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionHistoryResponse> {
    const userAccount = assetTypeCode 
      ? await this.accountRepository.findUserAccount(userId, assetTypeCode)
      : null;

    const accountId = userAccount?.id;
    
    let transactions;
    let total: number;

    if (accountId) {
      transactions = await this.ledgerRepository.getAccountHistory(accountId, limit, offset);
      total = await this.ledgerRepository.countAccountEntries(accountId);
    } else {
      transactions = await this.transactionRepository.findUserTransactions(
        userId,
        assetTypeCode,
        limit,
        offset
      );
      total = await this.transactionRepository.countUserTransactions(userId, assetTypeCode);
    }

    const historyItems = (transactions as any[]).map((item) => ({
      transactionId: item.transaction_id || item.transactionId,
      type: item.transaction_type || item.transaction?.transactionType,
      amount: (item.entry_type === 'CREDIT' ? '+' : '-') + item.amount.toString(),
      balanceAfter: item.balance_after?.toString() || item.balanceAfter?.toString() || '0',
      createdAt: item.created_at || item.createdAt,
      metadata: item.metadata || item.transaction?.metadata,
    }));

    return {
      userId,
      assetTypeCode,
      transactions: historyItems,
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }

  async getTransactionDetail(transactionId: string): Promise<TransactionDetail | null> {
    const transaction = await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      return null;
    }

    return {
      transactionId: transaction.id,
      type: transaction.transactionType,
      status: transaction.status,
      ledgerEntries: transaction.ledgerEntries.map((entry: any) => ({
        accountId: entry.accountId,
        entryType: entry.entryType,
        amount: entry.amount.toString(),
      })),
      createdAt: transaction.createdAt,
      completedAt: transaction.completedAt || undefined,
      metadata: transaction.metadata as Record<string, any> | undefined,
    };
  }
}
