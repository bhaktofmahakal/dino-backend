import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  console.log('📦 Creating asset types...');
  const goldCoin = await prisma.assetType.upsert({
    where: { code: 'GOLD_COIN' },
    update: {},
    create: {
      id: 'a1111111-1111-1111-1111-111111111111',
      code: 'GOLD_COIN',
      name: 'Gold Coins',
      description: 'Primary in-game currency',
      isActive: true,
    },
  });

  const diamond = await prisma.assetType.upsert({
    where: { code: 'DIAMOND' },
    update: {},
    create: {
      id: 'a2222222-2222-2222-2222-222222222222',
      code: 'DIAMOND',
      name: 'Diamonds',
      description: 'Premium currency',
      isActive: true,
    },
  });

  const loyaltyPoint = await prisma.assetType.upsert({
    where: { code: 'LOYALTY_POINT' },
    update: {},
    create: {
      id: 'a3333333-3333-3333-3333-333333333333',
      code: 'LOYALTY_POINT',
      name: 'Loyalty Points',
      description: 'Rewards program points',
      isActive: true,
    },
  });

  console.log('✅ Asset types created');

  console.log('🏦 Creating system accounts...');

  const systemAccounts = [
    { id: 'b1111111-1111-1111-1111-111111111111', assetTypeId: goldCoin.id, systemRole: 'TREASURY', isUnlimited: true },
    { id: 'b1111111-2222-2222-2222-222222222222', assetTypeId: goldCoin.id, systemRole: 'BONUS_POOL', isUnlimited: true },
    { id: 'b1111111-3333-3333-3333-333333333333', assetTypeId: goldCoin.id, systemRole: 'REVENUE', isUnlimited: false },

    { id: 'b2222222-1111-1111-1111-111111111111', assetTypeId: diamond.id, systemRole: 'TREASURY', isUnlimited: true },
    { id: 'b2222222-2222-2222-2222-222222222222', assetTypeId: diamond.id, systemRole: 'BONUS_POOL', isUnlimited: true },
    { id: 'b2222222-3333-3333-3333-333333333333', assetTypeId: diamond.id, systemRole: 'REVENUE', isUnlimited: false },

    { id: 'b3333333-1111-1111-1111-111111111111', assetTypeId: loyaltyPoint.id, systemRole: 'TREASURY', isUnlimited: true },
    { id: 'b3333333-2222-2222-2222-222222222222', assetTypeId: loyaltyPoint.id, systemRole: 'BONUS_POOL', isUnlimited: true },
    { id: 'b3333333-3333-3333-3333-333333333333', assetTypeId: loyaltyPoint.id, systemRole: 'REVENUE', isUnlimited: false },
  ];

  for (const sysAcc of systemAccounts) {
    await prisma.account.upsert({
      where: { id: sysAcc.id },
      update: {},
      create: {
        id: sysAcc.id,
        accountType: 'SYSTEM',
        ownerId: null,
        assetTypeId: sysAcc.assetTypeId,
        systemRole: sysAcc.systemRole as 'TREASURY' | 'BONUS_POOL' | 'REVENUE',
        balance: 0,
        isUnlimited: sysAcc.isUnlimited,
        version: 0,
      },
    });
  }

  console.log('✅ System accounts created');

  console.log('👥 Creating user accounts...');

  const user1Id = 'c0000001-0000-0000-0000-000000000001';
  const user2Id = 'c0000002-0000-0000-0000-000000000002';

  const user1Accounts = [
    { id: 'd1111111-1111-1111-1111-111111111111', ownerId: user1Id, assetTypeId: goldCoin.id, balance: 1000.00 },
    { id: 'd1111111-2222-2222-2222-222222222222', ownerId: user1Id, assetTypeId: diamond.id, balance: 100.00 },
    { id: 'd1111111-3333-3333-3333-333333333333', ownerId: user1Id, assetTypeId: loyaltyPoint.id, balance: 500.00 },
  ];

  const user2Accounts = [
    { id: 'd2222222-1111-1111-1111-111111111111', ownerId: user2Id, assetTypeId: goldCoin.id, balance: 500.00 },
    { id: 'd2222222-2222-2222-2222-222222222222', ownerId: user2Id, assetTypeId: diamond.id, balance: 50.00 },
    { id: 'd2222222-3333-3333-3333-333333333333', ownerId: user2Id, assetTypeId: loyaltyPoint.id, balance: 200.00 },
  ];

  for (const userAcc of [...user1Accounts, ...user2Accounts]) {
    await prisma.account.upsert({
      where: { id: userAcc.id },
      update: {},
      create: {
        id: userAcc.id,
        accountType: 'USER',
        ownerId: userAcc.ownerId,
        assetTypeId: userAcc.assetTypeId,
        systemRole: null,
        balance: userAcc.balance,
        isUnlimited: false,
        version: 0,
      },
    });
  }

  console.log('✅ User accounts created');

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   - Asset Types: 3 (GOLD_COIN, DIAMOND, LOYALTY_POINT)');
  console.log('   - System Accounts: 9 (3 per asset type)');
  console.log('   - User Accounts: 6 (2 users × 3 assets)');
  console.log('');
  console.log('👤 Test Users:');
  console.log(`   User 1 ID: ${user1Id}`);
  console.log(`   User 2 ID: ${user2Id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
