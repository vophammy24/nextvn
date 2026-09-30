import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().positive().default(5000),

  CLIENT_URL: z.string().url(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),

  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),

  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  PAYOS_CLIENT_ID: z.string().optional(),

  PAYOS_API_KEY: z.string().optional(),

  PAYOS_CHECKSUM_KEY: z.string().optional(),

  PAYOS_RETURN_URL: z.string().url().optional(),

  PAYOS_CANCEL_URL: z.string().url().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(z.treeifyError(result.error));

  throw new Error('Environment validation failed');
}

export const env = result.data;
