# NextVN: cài đặt và chạy dự án

Hướng dẫn dành cho thành viên clone repository trên máy mới (Windows, macOS hoặc Linux).

## 1. Cần cài

- **Git**: để clone/push repository.
- **Node.js 22.18 trở lên** và npm: kiểm tra bằng `node --version` và `npm --version`.
  - Dùng Node 22.18+ vì Prisma trong dependency tree yêu cầu phiên bản này trở lên.
- **Không cần cài Maven/Java**: dự án này dùng Node.js, React/Vite và Express.
- PostgreSQL chỉ cần khi nhóm bật/kết nối tính năng lưu database. Luồng đăng nhập hiện tại chưa lưu user/session vào PostgreSQL.

## 2. Clone và cài dependency

Từ thư mục chứa repository:

```powershell
git clone <URL_REPOSITORY>
cd nextvn
npm ci
```

`npm ci` đọc `package-lock.json` để cài đúng các phiên bản đã khóa cho cả client và server workspaces. Không cần cài package toàn cục.

## 3. Tạo file môi trường local

Trong PowerShell ở thư mục gốc `nextvn`:

```powershell
Copy-Item client\.env.example client\.env
Copy-Item server\.env.example server\.env
```

### `client/.env`

```dotenv
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### `server/.env`

Điền tối thiểu:

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=replace-with-postgresql-connection-string
JWT_ACCESS_SECRET=<secret ngẫu nhiên riêng, tối thiểu 32 bytes>
JWT_REFRESH_SECRET=<secret ngẫu nhiên khác, tối thiểu 32 bytes>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Có thể tạo secret hex ngẫu nhiên trong Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Chạy lệnh riêng cho từng secret; không dùng chung secret giữa các môi trường. Server hiện kiểm tra `DATABASE_URL` là giá trị không rỗng, nhưng luồng Google đăng nhập hiện lưu users/business/session bằng bộ nhớ tiến trình, chưa dùng database.

Các biến payOS chỉ cần điền khi triển khai tính năng thanh toán tương ứng; không đưa secret thật vào Git.

## 4. Cấu hình Google login local

1. Trong Google Cloud Console, tạo OAuth Client ID loại **Web application**.
2. Thêm `http://localhost:5173` vào **Authorized JavaScript origins**.
3. Dùng cùng một Client ID trong `client/.env` và `server/.env`.
4. Với Google Identity Services đang dùng, cấu hình này không cần OAuth redirect URI riêng. Origin khi truy cập ứng dụng phải khớp chính xác host và port đã đăng ký.
5. Sau khi sửa `.env`, khởi động lại dev server.

Không commit client secret, database credentials, JWT secrets hoặc file `.env`. Client ID không phải secret, nhưng vẫn phải cấu hình domain hợp lệ trong Google Cloud.

## 5. Chạy ứng dụng

Ở thư mục gốc:

```powershell
npm run dev
```

- Frontend: <http://localhost:5173>
- Backend health check: <http://localhost:5000/api/health>
- Trang đăng nhập: <http://localhost:5173/login>

Dừng bằng `Ctrl+C`.

## 6. Kiểm tra trước khi push

```powershell
npm run typecheck
npm test
npm run build
```

Kiểm tra các file môi trường không bị staged:

```powershell
git status --short
git check-ignore client\.env server\.env
```

Commit `package-lock.json`, `client/.env.example`, `server/.env.example` và source code. Không commit `client/.env`, `server/.env`, `node_modules`, `dist` hoặc credentials.

## 7. Giới hạn trước khi deploy cho người dùng thật

- Google login cần OAuth Client ID và production domain đã đăng ký trong Google Cloud.
- Dữ liệu user, doanh nghiệp, membership và session đang nằm trong `Map` của backend; restart server sẽ mất dữ liệu/session. Cần thay bằng PostgreSQL/Prisma và schema/migrations trước khi dùng production.
- Mỗi API instance có bộ nhớ riêng; không scale nhiều instance với session Map.
- Production cần HTTPS, secrets riêng cho môi trường, CORS origin đúng domain, cookie secure và hosting backend/frontend có cấu hình credentials phù hợp.
- Kiểm thử và typecheck pass không thay thế cho việc xác nhận luồng Google bằng Client ID/domain production và kiểm tra persistence.
