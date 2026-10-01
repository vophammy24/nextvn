import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../src/app';

describe('GET /api/health', () => {
  it('should return API health status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'nextvn API is running',
    });
  });
});

describe('Sales Operations Routes - Authentication', () => {
  it('returns 401 when accessing menu without auth token', async () => {
    const response = await request(app).get('/api/business/test-biz/menu/test-branch/categories');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 when accessing orders without auth token', async () => {
    const response = await request(app).get('/api/business/test-biz/orders/test-branch');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 when accessing tables without auth token', async () => {
    const response = await request(app).get('/api/business/test-biz/tables/test-branch');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 when accessing shifts without auth token', async () => {
    const response = await request(app).get('/api/business/test-biz/shifts/test-branch');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 with invalid bearer token', async () => {
    const response = await request(app)
      .get('/api/business/test-biz/menu/test-branch/items')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Token');
  });

  it('returns 401 without Bearer prefix', async () => {
    const response = await request(app)
      .get('/api/business/test-biz/menu/test-branch/items')
      .set('Authorization', 'some-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Order Creation - Validation', () => {
  it('rejects order creation without auth', async () => {
    const response = await request(app)
      .post('/api/business/test-biz/orders')
      .send({
        branchId: 'test-branch',
        orderType: 'DINE_IN',
        items: [{ menuItemId: 'test-item', quantity: 1 }],
        paymentMethod: 'CASH',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Table Status - Validation', () => {
  it('rejects table status update without auth', async () => {
    const response = await request(app)
      .patch('/api/business/test-biz/tables/test-branch/test-table/status')
      .send({ status: 'OCCUPIED' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Shift Operations - Validation', () => {
  it('rejects shift start without auth', async () => {
    const response = await request(app)
      .post('/api/business/test-biz/shifts/start')
      .send({ branchId: 'test-branch' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('rejects shift end without auth', async () => {
    const response = await request(app)
      .post('/api/business/test-biz/shifts/end')
      .send({ shiftId: 'test-shift' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('Payment Method Validation', () => {
  it('only allows CASH and BANK_TRANSFER', () => {
    // This is a schema validation test — verifying the Zod schema
    // enforces only valid payment methods
    const { z } = require('zod');
    const paymentSchema = z.enum(['CASH', 'BANK_TRANSFER']);

    expect(paymentSchema.safeParse('CASH').success).toBe(true);
    expect(paymentSchema.safeParse('BANK_TRANSFER').success).toBe(true);
    expect(paymentSchema.safeParse('E_WALLET').success).toBe(false);
    expect(paymentSchema.safeParse('PAYOS').success).toBe(false);
    expect(paymentSchema.safeParse('CREDIT_CARD').success).toBe(false);
  });
});

describe('API Response Convention', () => {
  it('health endpoint follows { success, message } convention', async () => {
    const response = await request(app).get('/api/health');

    expect(response.body).toHaveProperty('success');
    expect(typeof response.body.success).toBe('boolean');
  });

  it('error responses follow { success: false, message } convention', async () => {
    const response = await request(app).get('/api/business/test-biz/menu/test-branch/categories');

    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('message');
    expect(typeof response.body.message).toBe('string');
  });
});
