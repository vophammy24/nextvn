import { describe, expect, it } from 'vitest';

import { api } from '@/services/api';

describe('API client', () => {
  it('uses the configured backend base URL', () => {
    expect(api.defaults.baseURL).toBe('http://localhost:5000/api');
  });

  it('uses the expected request timeout', () => {
    expect(api.defaults.timeout).toBe(15_000);
  });
});
