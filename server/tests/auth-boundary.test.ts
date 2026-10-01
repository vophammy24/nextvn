import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../src/app';

describe('Ranh giới API khi xác thực chưa được triển khai', () => {
  it('JSON lỗi trả phản hồi tiếng Việt, không lộ stack hoặc dữ liệu gửi lên', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"password":"private-test"');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_REQUEST');
    expect(response.body.message).toContain('Không thể xử lý yêu cầu');
    expect(response.text).not.toMatch(/private-test|SyntaxError|stack/);
  });
  it.each(['/api/auth/me', '/api/auth/google'])(
    '%s không cấp danh tính hoặc token',
    async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(501);
      expect(response.body.code).toBe('AUTH_NOT_CONFIGURED');
      expect(response.body.user).toBeUndefined();
      expect(response.body.token).toBeUndefined();
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.headers['cache-control']).toBe('no-store');
    },
  );
  it('đăng nhập trả cùng phản hồi cho mọi thông tin, không phản chiếu mật khẩu', async () => {
    const first = await request(app)
      .post('/api/auth/login')
      .send({ email: 'one@example.test', password: 'test-secret' });
    const second = await request(app)
      .post('/api/auth/login')
      .send({ email: 'two@example.test', password: 'another-secret' });
    expect(first.status).toBe(501);
    expect(first.body).toEqual(second.body);
    expect(JSON.stringify(first.body)).not.toContain('test-secret');
    expect(first.headers['set-cookie']).toBeUndefined();
  });
  it.each(['STAFF', 'MANAGER', 'OWNER', 'ADMIN'])(
    'không tin vai trò %s do client tự khai',
    async (role) => {
      for (const path of [
        '/api/orders',
        '/api/inventory',
        '/api/owner/revenue',
        '/api/owner/users',
        '/api/admin/users',
      ]) {
        const response = await request(app)
          .get(path)
          .set('X-Role', role)
          .set('X-Business-Id', 'other-business')
          .set('Authorization', `Bearer ${role}`)
          .set('Cookie', `role=${role}`);
        expect(response.status).toBe(401);
        expect(response.body.code).toBe('AUTH_REQUIRED');
        expect(response.body.data).toBeUndefined();
      }
    },
  );
  it('không chấp nhận ghi dữ liệu nếu chưa xác minh phiên', async () => {
    const response = await request(app)
      .post('/api/owner/users')
      .send({ role: 'OWNER', businessId: 'other-business' });
    expect(response.status).toBe(401);
  });
});
