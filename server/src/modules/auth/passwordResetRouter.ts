import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import {
  forgotMessage,
  recoveryEmail,
  PasswordResetError,
  passwordResetService,
  invalidResetMessage,
} from './passwordResetService.js';

export function createPasswordResetRouter(service = passwordResetService, responseFloorMs = 750) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.post('/forgot-password', async (req, res) => {
    const started = performance.now();
    const parsed = z.object({ email: recoveryEmail }).strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Vui lòng nhập email hợp lệ.' });
      return;
    }
    let deliver: (() => Promise<void>) | null = null;
    try {
      deliver = await service.forgot(parsed.data.email, req.ip ?? 'unknown');
    } catch {
      console.warn('[PASSWORD_RESET_REQUEST_UNAVAILABLE]');
    }
    await delay(Math.max(0, responseFloorMs + randomInt(0, 101) - (performance.now() - started)));
    res.status(200).json({ message: forgotMessage });
    if (deliver)
      setImmediate(() => {
        void deliver!().catch(() => console.warn('[PASSWORD_RESET_DELIVERY_FAILED]'));
      });
  });
  router.post('/reset-password', async (req, res) => {
    // Rate limiting also covers malformed tokens and weak passwords inside the service.
    const parsed = z
      .object({ token: z.string().max(256), newPassword: z.string().max(256) })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: invalidResetMessage });
      return;
    }
    try {
      await service.reset(parsed.data.token, parsed.data.newPassword, req.ip ?? 'unknown');
      res.json({ message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.' });
    } catch (error) {
      if (error instanceof PasswordResetError)
        res.status(error.status).json({ message: error.message });
      else res.status(503).json({ message: 'Chưa thể đặt lại mật khẩu. Vui lòng thử lại.' });
    }
  });
  return router;
}
export const passwordResetRouter = createPasswordResetRouter();
