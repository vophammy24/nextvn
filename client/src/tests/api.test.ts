import { describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';

import { api } from '@/services/api';

describe('API client', () => {
  it('clears an expired session and signals protected UI, without treating a wrong login password as session expiry', async () => {
    const expired = vi.fn();
    window.addEventListener('nextvn:session-expired', expired);
    const previous = api.defaults.adapter;
    api.defaults.adapter = async (config) => {
      throw new AxiosError('unauthorized', undefined, config, undefined, {
        status: 401,
        data: {},
        headers: {},
        statusText: 'Unauthorized',
        config,
      });
    };
    try {
      localStorage.setItem('access_token', 'expired');
      await expect(api.get('/admin/dashboard')).rejects.toThrow();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(expired).toHaveBeenCalledTimes(1);
      await expect(api.post('/auth/login', {})).rejects.toThrow();
      expect(expired).toHaveBeenCalledTimes(1);
    } finally {
      api.defaults.adapter = previous;
      window.removeEventListener('nextvn:session-expired', expired);
      localStorage.clear();
    }
  });
  it('uses the configured backend base URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5000/api');
  });

  it('uses the expected request timeout', () => {
    expect(api.defaults.timeout).toBe(15_000);
  });
});
