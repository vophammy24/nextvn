import crypto from 'node:crypto';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from './config/env.js';

const app = express();
const sessions = new Map<string, SessionEntry>();
const users = new Map<string, GoogleUserRecord>();
const businesses = new Map<string, BusinessRecord>();
const branches = new Map<string, BranchRecord>();
const memberships = new Map<string, MembershipRecord>();
const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

interface GoogleUserRecord {
  id: string;
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  provider: 'google';
  createdAt: string;
}

interface BusinessRecord {
  id: string;
  name: string;
  ownerUserId: string;
  createdAt: string;
}

interface BranchRecord {
  id: string;
  businessId: string;
  name: string;
  createdAt: string;
}

interface MembershipRecord {
  id: string;
  userId: string;
  businessId: string;
  branchId?: string | null;
  role: 'STAFF' | 'MANAGER' | 'OWNER';
  createdAt: string;
}

interface SessionEntry {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  membership: {
    role: 'STAFF' | 'MANAGER' | 'OWNER';
    business: { id: string; name: string };
    branch?: { id: string; name: string } | null;
  };
}

function parseSessionCookie(req: Request) {
  const cookieHeader = req.headers.cookie ?? '';
  const cookie = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('nextvn_session='));

  if (!cookie) return null;
  return decodeURIComponent(cookie.slice('nextvn_session='.length));
}

function issueSessionCookie(res: Response, sessionId: string) {
  res.cookie('nextvn_session', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function createAuthenticatedSession(user: SessionEntry['user']) {
  const id = crypto.randomUUID();
  const existingUser = users.get(user.email.toLowerCase());
  const safeUser = existingUser ?? {
    id: user.id,
    googleId: user.id,
    email: user.email.toLowerCase(),
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ?? null,
    provider: 'google' as const,
    createdAt: new Date().toISOString(),
  };

  if (!existingUser) {
    users.set(safeUser.email, safeUser);
  }

  const businessId = `biz-${safeUser.id}`;
  const existingBusiness = businesses.get(businessId);
  if (!existingBusiness) {
    businesses.set(businessId, {
      id: businessId,
      name: `${safeUser.fullName.split(' ')[0] || 'Google'} Workspace`,
      ownerUserId: safeUser.id,
      createdAt: new Date().toISOString(),
    });
  }

  const branchId = `branch-${safeUser.id}`;
  if (!branches.has(branchId)) {
    branches.set(branchId, {
      id: branchId,
      businessId,
      name: 'Chi nhánh chính',
      createdAt: new Date().toISOString(),
    });
  }

  const membershipId = `member-${safeUser.id}`;
  if (!memberships.has(membershipId)) {
    memberships.set(membershipId, {
      id: membershipId,
      userId: safeUser.id,
      businessId,
      branchId,
      role: 'OWNER',
      createdAt: new Date().toISOString(),
    });
  }

  const membership = memberships.get(membershipId)!;
  const membershipEntry: SessionEntry['membership'] = {
    role: membership.role,
    business: {
      id: businesses.get(businessId)!.id,
      name: businesses.get(businessId)!.name,
    },
    branch: branches.get(branchId)
      ? { id: branches.get(branchId)!.id, name: branches.get(branchId)!.name }
      : null,
  };

  sessions.set(id, { user, membership: membershipEntry });
  return { id, user, membership: membershipEntry };
}

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API nextvn đang hoạt động',
  });
});

app.post('/api/auth/google', async (req, res) => {
  const credential = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';

  if (!credential) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REQUEST',
      message: 'Thiếu thông tin xác thực Google.',
    });
  }

  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    return res.status(503).set('Cache-Control', 'no-store').json({
      success: false,
      code: 'GOOGLE_AUTH_DISABLED',
      message: 'Đăng nhập Google chưa được cấu hình cho môi trường này.',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.name) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_GOOGLE_TOKEN',
        message: 'Token Google không hợp lệ.',
      });
    }

    const phone =
      'phone_number' in payload && typeof payload.phone_number === 'string'
        ? payload.phone_number
        : null;

    const userId = payload.sub;
    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = users.get(normalizedEmail);
      const session = createAuthenticatedSession({
      id: existingUser?.id ?? userId,
      fullName: payload.name,
      email: normalizedEmail,
      phone,
      avatarUrl: payload.picture ?? null,
    });

    issueSessionCookie(res, session.id);
    const token = jwt.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        role: session.membership.role,
        businessId: session.membership.business.id,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    return res.status(200).set('Cache-Control', 'no-store').json({
      success: true,
      message: 'Đăng nhập Google thành công. Tài khoản mới đã được tạo tự động.',
      accessToken: token,
      user: session.user,
      membership: session.membership,
    });
  } catch {
    return res.status(401).set('Cache-Control', 'no-store').json({
      success: false,
      code: 'INVALID_GOOGLE_TOKEN',
      message: 'Không thể xác minh tài khoản Google. Vui lòng thử lại.',
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  const sessionId = parseSessionCookie(req);
  const session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session) {
    return res.set('Cache-Control', 'no-store').status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Phiên đăng nhập đã hết hạn hoặc chưa được xác minh.',
    });
  }

  return res.set('Cache-Control', 'no-store').status(200).json({
    user: session.user,
    membership: session.membership,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = parseSessionCookie(req);
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie('nextvn_session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  return res.set('Cache-Control', 'no-store').status(200).json({
    success: true,
    message: 'Đã đăng xuất.',
  });
});

app.post('/api/auth/login', (_req, res) => {
  res.set('Cache-Control', 'no-store').status(501).json({
    success: false,
    code: 'AUTH_NOT_CONFIGURED',
    message: 'Dịch vụ xác thực doanh nghiệp chưa khả dụng trong môi trường này.',
  });
});

// Fail closed until real session verification and tenant authorization exist.
// Never treat client roles, identity headers or arbitrary cookies as authentication.
app.use('/api/auth', (_req, res) => {
  res.set('Cache-Control', 'no-store').status(501).json({
    success: false,
    code: 'AUTH_NOT_CONFIGURED',
    message: 'Dịch vụ xác thực chưa khả dụng trong môi trường này.',
  });
});
app.use('/api', (_req, res) => {
  res.set('Cache-Control', 'no-store').status(401).json({
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Chưa thể xác minh quyền truy cập. Vui lòng đăng nhập để tiếp tục.',
  });
});

const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 400 || error.status === 413)
      ? error.status
      : 500;
  res
    .set('Cache-Control', 'no-store')
    .status(status)
    .json({
      success: false,
      code: status === 500 ? 'REQUEST_FAILED' : 'INVALID_REQUEST',
      message:
        status === 500
          ? 'Dịch vụ đang gặp sự cố. Vui lòng thử lại sau.'
          : 'Không thể xử lý yêu cầu. Vui lòng kiểm tra dữ liệu gửi lên.',
    });
};
app.use(handleError);

export default app;
