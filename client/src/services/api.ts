import axios from 'axios';

import { env } from '@/config/env';
import { clearSalesDraftTabs } from '@/pages/staff/salesDraftTabs';

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.startsWith('/auth/')
    ) {
      localStorage.removeItem('access_token');
      clearSalesDraftTabs();
      window.dispatchEvent(new Event('nextvn:session-expired'));
    }
    return Promise.reject(error);
  },
);
