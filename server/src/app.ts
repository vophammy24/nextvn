import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API nextvn đang hoạt động',
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
    message: 'Chưa thể xác minh quyền truy cập. Vui lòng đăng nhập khi dịch vụ xác thực khả dụng.',
  });
});

const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  // No raw error, stack, request body or credentials in API error responses.
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
