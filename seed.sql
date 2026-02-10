-- consolidated Schema + Seed Data for Dino Ventures Wallet Service

-- Enums
CREATE TYPE "AccountType" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "SystemRole" AS ENUM ('TREASURY', 'BONUS_POOL', 'REVENUE');
CREATE TYPE "EntryType" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "TransactionType" AS ENUM ('TOP_UP', 'BONUS', 'SPEND');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Tables
CREATE TABLE "asset_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "asset_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "asset_types_code_key" UNIQUE ("code")
);

CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_type" "AccountType" NOT NULL,
    "owner_id" UUID,
    "asset_type_id" UUID NOT NULL,
    "system_role" "SystemRole",
    "balance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
    "version" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "accounts_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "asset_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "accounts_balance_check" CHECK (balance >= 0 OR is_unlimited = true)
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "idempotency_key" VARCHAR(255) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transactions_idempotency_key_key" UNIQUE ("idempotency_key")
);

CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "entry_type" "EntryType" NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "balance_after" DECIMAL(20,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ledger_entries_amount_check" CHECK (amount > 0)
);

CREATE TABLE "idempotency_store" (
    "idempotency_key" VARCHAR(255) NOT NULL,
    "transaction_id" UUID NOT NULL,
    "response_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "idempotency_store_pkey" PRIMARY KEY ("idempotency_key"),
    CONSTRAINT "idempotency_store_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes
CREATE INDEX "idx_accounts_owner_asset" ON "accounts"("owner_id", "asset_type_id");
CREATE INDEX "idx_accounts_system_role" ON "accounts"("system_role", "asset_type_id");
CREATE UNIQUE INDEX "unique_user_asset" ON "accounts"("owner_id", "asset_type_id");
CREATE UNIQUE INDEX "unique_system_asset" ON "accounts"("system_role", "asset_type_id");
CREATE INDEX "idx_ledger_transaction" ON "ledger_entries"("transaction_id");
CREATE INDEX "idx_ledger_account_history" ON "ledger_entries"("account_id", "created_at" DESC);

-- Initial Data: Asset Types
INSERT INTO "asset_types" (id, code, name, description) VALUES
('a1111111-1111-1111-1111-111111111111', 'GOLD_COIN', 'Gold Coins', 'Primary in-game currency'),
('a2222222-2222-2222-2222-222222222222', 'DIAMOND', 'Diamonds', 'Premium currency'),
('a3333333-3333-3333-3333-333333333333', 'LOYALTY_POINT', 'Loyalty Points', 'Rewards program points');

-- Initial Data: System Accounts
INSERT INTO "accounts" (id, account_type, asset_type_id, system_role, is_unlimited, balance) VALUES
-- Gold Coin System
('b1111111-1111-1111-1111-111111111111', 'SYSTEM', 'a1111111-1111-1111-1111-111111111111', 'TREASURY', true, 0),
('b1111111-2222-2222-2222-222222222222', 'SYSTEM', 'a1111111-1111-1111-1111-111111111111', 'BONUS_POOL', true, 0),
('b1111111-3333-3333-3333-333333333333', 'SYSTEM', 'a1111111-1111-1111-1111-111111111111', 'REVENUE', false, 0),
-- Diamond System
('b2222222-1111-1111-1111-111111111111', 'SYSTEM', 'a2222222-2222-2222-2222-222222222222', 'TREASURY', true, 0),
('b2222222-2222-2222-2222-222222222222', 'SYSTEM', 'a2222222-2222-2222-2222-222222222222', 'BONUS_POOL', true, 0),
('b2222222-3333-3333-3333-333333333333', 'SYSTEM', 'a2222222-2222-2222-2222-222222222222', 'REVENUE', false, 0),
-- Loyalty Point System
('b3333333-1111-1111-1111-111111111111', 'SYSTEM', 'a3333333-3333-3333-3333-333333333333', 'TREASURY', true, 0),
('b3333333-2222-2222-2222-222222222222', 'SYSTEM', 'a3333333-3333-3333-3333-333333333333', 'BONUS_POOL', true, 0),
('b3333333-3333-3333-3333-333333333333', 'SYSTEM', 'a3333333-3333-3333-3333-333333333333', 'REVENUE', false, 0);

-- Initial Data: User Accounts
-- User 1
INSERT INTO "accounts" (id, account_type, owner_id, asset_type_id, balance) VALUES
('d1111111-1111-1111-1111-111111111111', 'USER', 'c0000001-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 1000.00),
('d1111111-2222-2222-2222-222222222222', 'USER', 'c0000001-0000-0000-0000-000000000001', 'a2222222-2222-2222-2222-222222222222', 100.00),
('d1111111-3333-3333-3333-333333333333', 'USER', 'c0000001-0000-0000-0000-000000000001', 'a3333333-3333-3333-3333-333333333333', 500.00);
-- User 2
INSERT INTO "accounts" (id, account_type, owner_id, asset_type_id, balance) VALUES
('d2222222-1111-1111-1111-111111111111', 'USER', 'c0000002-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 500.00),
('d2222222-2222-2222-2222-222222222222', 'USER', 'c0000002-0000-0000-0000-000000000002', 'a2222222-2222-2222-2222-222222222222', 50.00),
('d2222222-3333-3333-3333-333333333333', 'USER', 'c0000002-0000-0000-0000-000000000002', 'a3333333-3333-3333-3333-333333333333', 200.00);
