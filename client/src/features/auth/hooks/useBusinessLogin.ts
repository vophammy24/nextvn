import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthError, loginBusiness } from '../api';
import { authCopy } from '../copy';
import type { BusinessLoginInput } from '../types';

export function useBusinessLogin() {
  const credentials = useRef<BusinessLoginInput | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      credentials.current = null;
    },
    [],
  );
  const mutation = useMutation<never, AuthError, void>({
    mutationKey: ['auth', 'business-login'],
    retry: false,
    gcTime: 0,
    networkMode: 'always',
    mutationFn: async () => {
      const input = credentials.current;
      credentials.current = null;
      if (!input) throw new AuthError(authCopy.invalidCredentials);
      request.current = new AbortController();
      try {
        return await loginBusiness(input, request.current.signal);
      } finally {
        request.current = null;
      }
    },
  });
  return {
    ...mutation,
    submit: (input: BusinessLoginInput) => {
      if (mutation.isPending || request.current || credentials.current) return;
      // No credentials in mutation variables, which TanStack Query retains in its cache.
      credentials.current = input;
      mutation.mutate();
    },
  };
}
