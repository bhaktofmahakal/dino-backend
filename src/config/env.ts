import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().optional().transform((val) => val || process.env.SERVER_PORT || '8080').transform(Number).pipe(z.number().min(1).max(65535)),
  SERVER_PORT: z.string().optional().transform((val) => val || process.env.PORT || '8080').transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  IDEMPOTENCY_TTL_HOURS: z.string().transform(Number).pipe(z.number().positive()).default('24'),
});

const envData = {
  ...process.env,
  SERVER_PORT: process.env.SERVER_PORT || process.env.PORT || '8080'
};

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(envData);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

export const env = parseEnv();
