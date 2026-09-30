import axios from 'axios';

import { env } from '@/config/env';

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});
