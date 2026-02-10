import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionOrchestrator } from './transaction-orchestrator';
import { Decimal } from '@prisma/client/runtime/library';

const mockAccountRepository = {
    resolveUserAccountId: vi.fn(),
    resolveSystemAccountId: vi.fn(),
    lockAccountsInOrder: vi.fn(),
    updateBalance: vi.fn(),
};

const mockAccountService = {
    validateSufficientBalance: vi.fn(),
};

const mockLedgerService = {
    recordDebit: vi.fn(),
    recordCredit: vi.fn(),
};

const mockIdempotencyService = {
    checkIdempotencyTx: vi.fn(),
    storeIdempotencyRecord: vi.fn(),
};

const mockTransactionRepository = {
    createTransaction: vi.fn(),
    updateStatus: vi.fn(),
};

vi.mock('../../config/database', () => ({
    prisma: {
        $transaction: vi.fn((callback) => callback('mock-tx')),
    },
}));

describe('TransactionOrchestrator', () => {
    let orchestrator: TransactionOrchestrator;

    beforeEach(() => {
        vi.clearAllMocks();
        orchestrator = new TransactionOrchestrator(
            mockAccountRepository as any,
            mockAccountService as any,
            mockLedgerService as any,
            mockIdempotencyService as any,
            mockTransactionRepository as any
        );
    });

    describe('executeTopUp', () => {
        it('should successfully execute a top-up transaction', async () => {
            const request = {
                userId: 'user-1',
                assetTypeCode: 'GOLD_COIN',
                amount: '100.00',
            };
            const idempotencyKey = 'key-1';

            mockIdempotencyService.checkIdempotencyTx.mockResolvedValue({ exists: false });
            mockTransactionRepository.createTransaction.mockResolvedValue({ id: 'tx-1', createdAt: new Date() });
            mockAccountRepository.resolveUserAccountId.mockResolvedValue('acc-user-1');
            mockAccountRepository.resolveSystemAccountId.mockResolvedValue('acc-sys-1');

            const userAccount = { id: 'acc-user-1', balance: new Decimal('0'), version: 0n };
            const systemAccount = { id: 'acc-sys-1', balance: new Decimal('1000'), version: 0n };

            mockAccountRepository.lockAccountsInOrder.mockResolvedValue([userAccount, systemAccount]);

            const result = await orchestrator.executeTopUp(request, idempotencyKey);

            expect(result.status).toBe('COMPLETED');
            expect(result.newBalance).toBe('100');
            expect(mockLedgerService.recordDebit).toHaveBeenCalled();
            expect(mockLedgerService.recordCredit).toHaveBeenCalled();
            expect(mockAccountRepository.updateBalance).toHaveBeenCalledTimes(2);
        });

        it('should return cached response if idempotency key exists', async () => {
            const request = { userId: 'u1', assetTypeCode: 'G', amount: '10' };
            const cachedResponse = { transactionId: 'cached-1' } as any;

            mockIdempotencyService.checkIdempotencyTx.mockResolvedValue({
                exists: true,
                response: cachedResponse
            });

            const result = await orchestrator.executeTopUp(request, 'key-1');

            expect(result.transactionId).toBe('cached-1');
            expect(mockTransactionRepository.createTransaction).not.toHaveBeenCalled();
        });
    });

    describe('executeSpend', () => {
        it('should fail if balance is insufficient', async () => {
            const request = { userId: 'u1', assetTypeCode: 'G', amount: '100' };

            mockIdempotencyService.checkIdempotencyTx.mockResolvedValue({ exists: false });
            mockTransactionRepository.createTransaction.mockResolvedValue({ id: 'tx-1' });
            mockAccountRepository.lockAccountsInOrder.mockResolvedValue([
                { id: 'u', balance: new Decimal('50') },
                { id: 's', balance: new Decimal('0') }
            ]);

            mockAccountService.validateSufficientBalance.mockImplementation(() => {
                throw new Error('Insufficient balance');
            });

            await expect(orchestrator.executeSpend(request, 'key-1')).rejects.toThrow('Insufficient balance');
        });
    });
});
