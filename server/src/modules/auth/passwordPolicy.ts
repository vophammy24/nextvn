import bcrypt from 'bcrypt';
import { z } from 'zod';

export const passwordPolicy = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72);
export const hashPassword = (value: string) => bcrypt.hash(value, 12);
export const comparePassword = (value: string, hash: string) => bcrypt.compare(value, hash);
