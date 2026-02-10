import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountNotFoundError, AssetTypeNotFoundError, ConcurrencyError } from '../../common/errors';
import type { SystemRole } from '../../common/types';

export type AccountBase = Prisma.AccountGetPayload<{}>;

export type AccountWithAssetType = Prisma.AccountGetPayload<{
  include: { assetType: true };
}>;

export class AccountRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async findUserAccount(userId: string, assetTypeCode: string): Promise<AccountWithAssetType> {
    const account = await this.prisma.account.findFirst({
      where: {
        accountType: 'USER',
        ownerId: userId,
        assetType: {
          code: assetTypeCode,
        },
      },
      include: {
        assetType: true,
      },
    });

    if (!account) {
      throw new AccountNotFoundError(`User ${userId} with asset ${assetTypeCode}`);
    }

    return account;
  }

  async findSystemAccount(systemRole: SystemRole, assetTypeCode: string): Promise<AccountWithAssetType> {
    const account = await this.prisma.account.findFirst({
      where: {
        accountType: 'SYSTEM',
        systemRole,
        assetType: {
          code: assetTypeCode,
        },
      },
      include: {
        assetType: true,
      },
    });

    if (!account) {
      throw new AccountNotFoundError(`System ${systemRole} with asset ${assetTypeCode}`);
    }

    return account;
  }

  // Snapshot-consistent read within transaction
  async resolveUserAccountId(
    userId: string,
    assetTypeCode: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const account = await tx.account.findFirst({
      where: {
        accountType: 'USER',
        ownerId: userId,
        assetType: { code: assetTypeCode },
      },
      select: { id: true },
    });

    if (!account) {
      throw new AccountNotFoundError(`User ${userId} with asset ${assetTypeCode}`);
    }

    return account.id;
  }

  // Snapshot-consistent read within transaction
  async resolveSystemAccountId(
    systemRole: SystemRole,
    assetTypeCode: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const account = await tx.account.findFirst({
      where: {
        accountType: 'SYSTEM',
        systemRole,
        assetType: { code: assetTypeCode },
      },
      select: { id: true },
    });

    if (!account) {
      throw new AccountNotFoundError(`System ${systemRole} with asset ${assetTypeCode}`);
    }

    return account.id;
  }

  // Deterministic lock ordering prevents deadlocks
  async lockAccountsInOrder(
    accountIds: string[],
    tx: Prisma.TransactionClient
  ): Promise<AccountWithAssetType[]> {
    const sortedIds = [...accountIds].sort();
    const accounts: AccountWithAssetType[] = [];

    for (const id of sortedIds) {
      // Manual locking required as Prisma does not support FOR UPDATE in findFirst/findUnique
      await tx.$queryRaw`SELECT id FROM accounts WHERE id = ${id}::uuid FOR UPDATE`;

      const account = await tx.account.findUnique({
        where: { id },
        include: { assetType: true },
      });

      if (!account) {
        throw new AccountNotFoundError(id);
      }

      accounts.push(account);
    }

    return accounts;
  }

  // Optimistic version check acts as defense-in-depth alongside pessimistic locks
  async updateBalance(
    accountId: string,
    newBalance: Decimal,
    expectedVersion: bigint,
    tx: Prisma.TransactionClient
  ): Promise<void> {
    const result = await tx.$executeRaw`
      UPDATE accounts 
      SET balance = ${newBalance}::decimal, 
          version = version + 1,
          updated_at = NOW()
      WHERE id = ${accountId}::uuid 
        AND version = ${expectedVersion}
    `;

    if (result === 0) {
      throw new ConcurrencyError();
    }
  }

  async getUserBalances(userId: string): Promise<AccountWithAssetType[]> {
    return this.prisma.account.findMany({
      where: {
        accountType: 'USER',
        ownerId: userId,
      },
      include: {
        assetType: true,
      },
      orderBy: {
        assetType: {
          code: 'asc',
        },
      },
    });
  }

  async getAssetTypeByCode(code: string) {
    const assetType = await this.prisma.assetType.findUnique({
      where: { code },
    });

    if (!assetType) {
      throw new AssetTypeNotFoundError(code);
    }

    return assetType;
  }
}
