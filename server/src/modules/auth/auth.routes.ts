import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../prisma/db.js';
import { env } from '../../config/env.js';

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9._]+$/);
const password = z
  .string()
  .min(8)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72);
const login = z.object({ username, password });
const register = login.extend({
  email: z.email().trim().toLowerCase(),
  fullName: z.string().trim().min(1).max(120),
});
type User = Awaited<ReturnType<typeof db.orm.public.User.create>>;
function session(user: User) {
  return {
    accessToken: jwt.sign(
      { userId: user.id, email: user.email, platformRole: user.platformRole },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    ),
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      platformRole: user.platformRole,
    },
  };
}
export const authRouter = Router();
authRouter.post('/login', async (req, res) => {
  const parsed = login.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Tên đăng nhập hoặc mật khẩu không hợp lệ.' });
    return;
  }
  try {
    const user = await db.orm.public.User.where({ username: parsed.data.username }).first();
    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash)) ||
      user.status !== 'ACTIVE'
    ) {
      res.status(401).json({
        message: 'Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản không hoạt động.',
      });
      return;
    }
    res.json(session(user));
  } catch {
    res.status(503).json({ message: 'Không thể đăng nhập. Vui lòng thử lại.' });
  }
});
authRouter.post('/register', async (req, res) => {
  const parsed = register.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: 'Thông tin không hợp lệ. Mật khẩu cần ít nhất 8 ký tự (tối đa 72 byte).' });
    return;
  }
  const { password: secret, ...data } = parsed.data;
  const duplicate = async () =>
    Boolean(
      (await db.orm.public.User.where({ username: data.username }).first()) ||
      (await db.orm.public.User.where({ email: data.email }).first()),
    );
  try {
    if (await duplicate()) {
      res.status(409).json({ message: 'Tên đăng nhập hoặc email đã tồn tại.' });
      return;
    }
    const user = await db.orm.public.User.create({
      ...data,
      passwordHash: await bcrypt.hash(secret, 12),
    });
    res.status(201).json(session(user));
  } catch {
    // Resolve a concurrent registration race without exposing database errors.
    const conflict = await duplicate().catch(() => false);
    res.status(conflict ? 409 : 503).json({
      message: conflict
        ? 'Tên đăng nhập hoặc email đã tồn tại.'
        : 'Không thể đăng ký. Vui lòng thử lại.',
    });
  }
});
