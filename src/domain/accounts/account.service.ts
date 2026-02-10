import { Account } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InsufficientBalanceError } from '../../common/errors';
import { AccountRepository } from './account.repository';
import type { BalanceInfo, UserBalancesResponse } from '../../common/types';

export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  validateSufficientBalance(account: Account, requiredAmount: Decimal): void {
    if (account.isUnlimited) {
      return;
    }

    if (account.balance.lessThan(requiredAmount)) {
      throw new InsufficientBalanceError(
        account.balance.toString(),
        requiredAmount.toString()
      );
    }
  }

  async getUserBalances(userId: string): Promise<UserBalancesResponse> {
    const accounts = await this.accountRepository.getUserBalances(userId);

    const balances: BalanceInfo[] = accounts.map((account) => ({
      assetTypeCode: (account as any).assetType.code,
      balance: account.balance.toString(),
    }));

    return {
      userId,
      balances,
    };
  }
}
