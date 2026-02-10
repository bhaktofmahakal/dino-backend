-- Fix: Allow unlimited system accounts to have negative balances
-- System accounts (TREASURY, BONUS_POOL) are debited when crediting users.
-- They start at balance 0 and go negative, which is correct for unlimited accounts.
-- The old CHECK (balance >= 0) blocked this behavior.

-- Drop the old constraint
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_balance_check";

-- Add corrected constraint: normal accounts must stay >= 0, unlimited accounts are exempt
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_balance_check" CHECK (balance >= 0 OR is_unlimited = true);
