import { afterEach, describe, expect, it } from 'vitest';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { api } from '@/services/api';
import { inventoryRequest } from '@/features/inventory/api';
const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  localStorage.removeItem('access_token');
});
describe('Inventory business scope and existing JWT transport', () => {
  it('encodes scope and attaches the existing access token without cookie authentication', async () => {
    localStorage.setItem('access_token', 'test-only-token');
    let received: InternalAxiosRequestConfig | undefined;
    const adapter: AxiosAdapter = async (config) => {
      received = config;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config,
      };
    };
    api.defaults.adapter = adapter;
    await inventoryRequest('business/a', 'branch/b', '/transactions', 'POST', {
      requestKey: 'retry-key',
    });
    expect(received?.url).toBe('/business/business%2Fa/inventory/branches/branch%2Fb/transactions');
    expect(received?.headers.get('Authorization')).toBe('Bearer test-only-token');
    expect(received?.withCredentials).not.toBe(true);
    expect(received?.headers.has('x-role')).toBe(false);
    expect(received?.headers.has('x-business-id')).toBe(false);
  });
  it('does not fabricate a token and safely reports rejected authentication', async () => {
    api.defaults.adapter = async (config) => {
      expect(config.headers.has('Authorization')).toBe(false);
      throw new AxiosError('Unauthorized', undefined, config, undefined, {
        config,
        data: { message: 'private detail' },
        status: 401,
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
      });
    };
    await expect(inventoryRequest('business-1', 'branch-1')).rejects.toThrow(
      'Vui lòng đăng nhập để tiếp tục.',
    );
  });
});
