import type { z } from 'zod';
import type { businessLoginSchema } from './schemas';

export type BusinessLoginInput = z.infer<typeof businessLoginSchema>;
export type LoginFieldErrors = Partial<Record<keyof BusinessLoginInput, string>>;
