import { isAxiosError } from 'axios';
import { api } from '@/services/api';
import { authCopy } from './copy';
import type { BusinessLoginInput } from './types';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// This is the proposed integration endpoint; the current server has no auth routes.
// Never retain Axios errors: their request config can contain the submitted password.
export async function loginBusiness(
  input: BusinessLoginInput,
  signal?: AbortSignal,
): Promise<never> {
  try {
    await api.post<unknown>('/auth/login', input, { signal });
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 400 || status === 401 || status === 403 || status === 422) {
        throw new AuthError(authCopy.invalidCredentials);
      }
      if (status === 404 || status === 405 || status === 501) {
        throw new AuthError(authCopy.businessUnavailable);
      }
      if (status === 429) throw new AuthError(authCopy.rateLimited);
      if (!error.response) throw new AuthError(authCopy.connectionError);
    }
    throw new AuthError(authCopy.serverError);
  }
  // A 2xx response alone is not proof of authentication. Session verification,
  // transport, CSRF protections and response schemas must be agreed with the backend.
  // Until then, do not consume tokens, populate user state or navigate into /app.
  throw new AuthError(authCopy.unverifiedSession);
}
