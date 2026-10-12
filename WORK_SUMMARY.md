# NextVN – Nhật ký công việc

## Cài đặt và chạy

- Đã chạy `npm install` tại thư mục gốc để cài các workspace dependencies và cập nhật lockfile.
- Đã cài `google-auth-library` cho backend để xác minh credential Google.
- Đã khởi động client và server bằng `npm run dev`.
- Địa chỉ local: frontend `http://localhost:5173`, backend `http://localhost:5000`.
- Node trong môi trường ban đầu là 22.16.0; dependency Prisma yêu cầu Node >= 22.18.0. Dùng Node 22.18+ trên máy thành viên để cài/chạy nhất quán.
- Maven đã được cài vào máy phát triển trong phiên làm việc, nhưng dự án NextVN không cần Maven/Java.

## Các thay đổi chức năng đã làm

- Nối giao diện Google Identity Services với backend endpoint `/api/auth/google`.
- Backend xác minh Google ID token và tạo tài khoản, doanh nghiệp, chi nhánh, membership Owner khi đăng nhập lần đầu.
- Thêm API `/api/auth/me` và `/api/auth/logout`; logout xóa session phía server và cookie.
- Nối nút đăng xuất ở sidebar và hồ sơ; có trạng thái đang xử lý, báo lỗi và điều hướng về `/login`.
- Ẩn thanh scrollbar bằng CSS nhưng vẫn giữ thao tác cuộn.
- Cập nhật các file `.env.example`; file `.env` thật được Git ignore.

## Kiểm tra đã chạy

- Client typecheck: đạt.
- Backend build: đạt.
- Backend auth-boundary tests: 10/10 đạt.
- Client auth tests: 16/16 đạt ở lần chạy sau; trước đó một lần chạy gặp timeout trong test hủy request.
- Kiểm tra endpoint logout đang chạy trên local: HTTP 200, cookie session được xóa.
- Kiểm tra CSS scrollbar trong trình duyệt: thanh cuộn ẩn, nội dung vẫn cuộn được.

## Lưu ý trước production

- Google Cloud OAuth phải cho phép đúng JavaScript origin, bao gồm domain production.
- User/business/membership/session hiện lưu trong `Map` trong bộ nhớ; khởi động lại server sẽ mất dữ liệu/session. Chưa sẵn sàng cho production hoặc chạy nhiều instance trước khi chuyển sang PostgreSQL/Prisma.
- Quá trình cài dependency có cảnh báo audit vulnerabilities; xem lại `npm audit` và xử lý riêng trước khi phát hành.
- Hướng dẫn cài dependency, tạo `.env`, chạy, kiểm tra và các giới hạn được ghi trong [SETUP.md](./SETUP.md).
