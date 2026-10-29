import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth.js';
import { invitationService, InvitationError } from './invitationService.js';
const router = Router();
router.post('/accept', authenticate, async (req, res) => {
  const input = z
    .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
    .strict()
    .safeParse(req.body);
  if (!input.success) return res.status(400).json({ message: 'Liên kết lời mời không hợp lệ.' });
  try {
    return res.json(
      await invitationService.accept((req as AuthenticatedRequest).user.userId, input.data.token),
    );
  } catch (error) {
    if (error instanceof InvitationError)
      return res.status(error.status).json({ code: error.code, message: error.message });
    return res.status(503).json({ message: 'Không thể chấp nhận lời mời. Vui lòng thử lại.' });
  }
});
export default router;
