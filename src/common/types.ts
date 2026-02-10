import { Decimal } from '@prisma/client/runtime/library';

export type TransactionType = 'TOP_UP' | 'BONUS' | 'SPEND';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type AccountType = 'USER' | 'SYSTEM';
export type SystemRole = 'TREASURY' | 'BONUS_POOL' | 'REVENUE';
export type EntryType = 'DEBIT' | 'CREDIT';

export interface CreateTransactionRequest {
  userId: string;
  assetTypeCode: string;
  amount: string | Decimal;
  metadata?: Record<string, any>;
}

export interface TopUpRequest extends CreateTransactionRequest {
  paymentReference?: string;
}

export interface BonusRequest extends CreateTransactionRequest {
  reason: string;
}

export interface SpendRequest extends CreateTransactionRequest {
  itemId?: string;
}

export interface TransactionResponse {
  transactionId: string;
  status: TransactionStatus;
  userId: string;
  assetTypeCode: string;
  amount: string;
  newBalance: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface BalanceInfo {
  assetTypeCode: string;
  balance: string;
}

export interface UserBalancesResponse {
  userId: string;
  balances: BalanceInfo[];
}

export interface TransactionHistoryItem {
  transactionId: string;
  type: TransactionType;
  amount: string;
  balanceAfter: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface TransactionHistoryResponse {
  userId: string;
  assetTypeCode?: string;
  transactions: TransactionHistoryItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface TransactionDetail {
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  ledgerEntries: Array<{
    accountId: string;
    entryType: EntryType;
    amount: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}
