import { z } from 'zod';
import { authCopy } from './copy';

export const businessLoginSchema = z.object({
  email: z.string().trim().min(1, authCopy.emailRequired).pipe(z.email(authCopy.emailInvalid)),
  password: z.string().min(1, authCopy.passwordRequired),
});
