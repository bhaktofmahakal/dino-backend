import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID format');
const amountSchema = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a valid decimal with up to 2 decimal places');
const assetTypeCodeSchema = z.enum(['GOLD_COIN', 'DIAMOND', 'LOYALTY_POINT']);

export const topUpRequestSchema = z.object({
  userId: uuidSchema,
  assetTypeCode: assetTypeCodeSchema,
  amount: amountSchema,
  paymentReference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const bonusRequestSchema = z.object({
  userId: uuidSchema,
  assetTypeCode: assetTypeCodeSchema,
  amount: amountSchema,
  reason: z.string().min(1, 'Reason is required'),
  metadata: z.record(z.any()).optional(),
});

export const spendRequestSchema = z.object({
  userId: uuidSchema,
  assetTypeCode: assetTypeCodeSchema,
  amount: amountSchema,
  itemId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const transactionHistoryQuerySchema = z.object({
  assetTypeCode: assetTypeCodeSchema.optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('50'),
  offset: z.string().transform(Number).pipe(z.number().min(0)).default('0'),
});

export type TopUpRequestSchema = z.infer<typeof topUpRequestSchema>;
export type BonusRequestSchema = z.infer<typeof bonusRequestSchema>;
export type SpendRequestSchema = z.infer<typeof spendRequestSchema>;
export type TransactionHistoryQuerySchema = z.infer<typeof transactionHistoryQuerySchema>;
