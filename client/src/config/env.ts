import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  VITE_GOOGLE_CLIENT_ID: z.string().min(1).optional(),
});

const result = envSchema.safeParse(import.meta.env);

if (!result.success) {
  console.error('Invalid frontend environment variables:');
  console.error(z.treeifyError(result.error));

  throw new Error('Frontend environment validation failed');
}

export const env = result.data;
