import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
const mock = vi.hoisted(() => ({ first: vi.fn(), create: vi.fn(), where: vi.fn() }));
vi.mock('../src/prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        User: {
          where: (v: unknown) => {
            mock.where(v);
            return { first: mock.first };
          },
          create: mock.create,
        },
      },
    },
  },
}));
import { authRouter } from '../src/modules/auth/auth.routes.js';
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
const secret = 'TestPassword@2026';
const user = {
  id: 'demo-user',
  username: 'owner.demo',
  email: 'owner@example.test',
  fullName: 'Demo Owner',
  platformRole: 'USER',
  status: 'ACTIVE',
  passwordHash: await bcrypt.hash(secret, 4),
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.first.mockResolvedValue(user);
  mock.create.mockImplementation(async (data) => ({ ...user, ...data }));
});
describe('local authentication', () => {
  it('normalizes username, verifies bcrypt, and returns the existing JWT claims without the hash', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ username: ' OWNER.DEMO ', password: secret })
      .expect(200);
    expect(mock.where).toHaveBeenCalledWith({ username: 'owner.demo' });
    expect(jwt.verify(r.body.accessToken, env.JWT_ACCESS_SECRET)).toMatchObject({
      userId: user.id,
      email: user.email,
      platformRole: 'USER',
    });
    expect(JSON.stringify(r.body)).not.toContain('passwordHash');
    expect(JSON.stringify(r.body)).not.toContain(secret);
  });
  it('rejects incorrect password', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner.demo', password: 'WrongPassword' })
      .expect(401);
  });
  it('rejects unknown username', async () => {
    mock.first.mockResolvedValue(null);
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'unknown', password: secret })
      .expect(401);
  });
  it('rejects inactive users', async () => {
    mock.first.mockResolvedValue({ ...user, status: 'INACTIVE' });
    await request(app)
      .post('/api/auth/login')
      .send({ username: 'owner.demo', password: secret })
      .expect(401);
  });
  it('rejects duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'owner.demo',
        email: 'new@example.test',
        password: secret,
        fullName: 'Demo',
      })
      .expect(409);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('rejects duplicate email', async () => {
    mock.first.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'new.demo', email: user.email, password: secret, fullName: 'Demo' })
      .expect(409);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it('registers with a bcrypt hash and no elevated role', async () => {
    mock.first.mockResolvedValue(null);
    const r = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'NEW.DEMO',
        email: 'new@example.test',
        password: secret,
        fullName: 'Demo',
        platformRole: 'ADMIN',
      })
      .expect(201);
    const input = mock.create.mock.calls[0][0];
    expect(await bcrypt.compare(secret, input.passwordHash)).toBe(true);
    expect(input.username).toBe('new.demo');
    expect(input.platformRole).toBeUndefined();
    expect(r.body.user.passwordHash).toBeUndefined();
  });
  it.each([
    { username: 'ab', password: secret },
    { username: 'bad-name', password: secret },
    { username: 'valid', password: 'short' },
  ])('validates credentials %o', async (credentials) => {
    await request(app).post('/api/auth/login').send(credentials).expect(400);
  });
});
