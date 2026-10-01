# Tích hợp Inventory vào nhánh Sales

## Nguồn khôi phục

Chỉ khôi phục từng tệp còn thiếu từ `ae27cda`, không lấy nguyên thư mục:

- `client/src/app/navigation.ts`
- `client/src/components/common/AnalyticsChart.tsx`
- `client/src/components/common/DataTable.tsx`
- `client/src/components/common/Foundation.tsx`
- `client/src/features/auth/workspaceContext.ts`
- `client/src/features/manager/AnalyticsPages.tsx`
- `client/src/features/manager/Charts.tsx`
- `client/src/features/manager/StaffPage.tsx`
- `client/src/features/manager/data.tsx`
- `client/src/features/manager/dev/fixtures.ts`
- `client/src/features/manager/export.ts`
- `client/src/features/manager/manager.css`
- `client/src/lib/format.ts`
- `client/src/locales/vi.ts`

Không khôi phục thêm tệp nào từ `bb564b6`: mã Inventory/Recipe đã có trong working tree khi bắt đầu. `workspaceContext.ts` được điều chỉnh để chứa kiểu dữ liệu context, không kéo thêm Zustand store của foundation. Các màn hình Analytics/Staff là dependency được khôi phục của ManagerPage, không thêm route nghiệp vụ mới cho chúng.

## Workspace, API và xác thực

Ứng dụng bootstrap bằng `GET /api/workspace`, chỉ dùng `authenticate`, lấy userId từ JWT đã xác thực rồi đọc tất cả membership đang hoạt động bằng Prisma ORM `.where({userId,isActive:true}).all()`. Không nhận scope từ header/query/body. User không hoạt động hoặc không có membership trả 403. Đúng một membership hợp lệ trả `{user,business,branch?,role}`; MANAGER/STAFF cần branch đang hoạt động thuộc đúng business, OWNER bỏ branch. Platform ADMIN không tự trở thành OWNER. Không trả mật khẩu hoặc token.

Nhiều membership đang hoạt động luôn trả 409 `WORKSPACE_SELECTION_REQUIRED`, không tự chọn ngay cả khi chỉ còn một lựa chọn có chi nhánh hợp lệ. Danh sách lựa chọn chỉ chứa workspace hợp lệ, được sắp xếp theo businessId/branchId. Frontend hiển thị yêu cầu chọn doanh nghiệp; chưa triển khai bộ chọn. Endpoint scoped cũ `/api/business/:businessId/workspace` được giữ để tương thích nhưng không dùng bootstrap.

`workspaceQuery.ts` gọi `/workspace` với query key `['workspace']`, kiểm tra kết quả bằng Zod; không import Sales API, không dùng VITE_BUSINESS_ID/VITE_BRANCH_ID. Inventory dùng business và branch từ workspace. Không tạo login endpoint hoặc token store thứ hai. TanStack Query giữ trạng thái server, React context cung cấp cùng workspace cho sidebar và trang.

URL dữ liệu: `/api/business/:businessId/inventory/branches/:branchId`. Query key và fingerprint giao dịch chứa cả businessId/branchId. Giữ request key khi retry cùng nội dung sau lỗi mạng. Axios hiện có tự gắn `Authorization: Bearer <JWT>` từ nguồn `access_token`; Inventory không dùng cookie thay cho Bearer, không thêm header quyền tự khai báo.

Middleware membership được sửa hai truy vấn sang `db.orm.public.BusinessMember/Branch.where(...).first()` của Prisma runtime hiện có. API `rawDb.BusinessMember?.findMany()` cũ không tồn tại trên runtime, khiến kiểm tra membership luôn thất bại dù TypeScript trước đó đã qua nhờ ép kiểu. Không sửa schema hoặc nghiệp vụ Menu/Order/Table/Shift.

## Route và giới hạn

Bốn route quản lý kho: `/app/inventory`, `/app/stock-transactions`, `/app/recipes`, `/app/alerts`. Chỉ MANAGER thấy liên kết và mở trang quản lý. STAFF/OWNER bị chặn trên URL quản lý; backend vẫn kiểm tra độc lập. Trang Owner hiện có `pages/owner/InventoryOverviewPage.tsx` được nối tại `/app/owner/inventory`, chỉ đọc `/api/business/:businessId/inventory/summary` với ID từ workspace. Hiển thị tồn, mức cảnh báo, giá trị ước tính và tiêu thụ 30 ngày theo chi nhánh; không có mutation. STAFF/MANAGER không mở được trang tổng hợp. Các route POS/Tables/Orders/Shift, API Sales, cart và kiểu Sales được giữ nguyên.

CSS bổ sung nằm trong `.inventory-integration`, không thay design system Sales. Fixture chỉ được dùng trong provider xem thử tường minh; provider thực tế luôn `isPreview: false`, không dùng fixture khi API lỗi.

Kiểm thử mới gồm business-scoped URL, Bearer thực qua interceptor Axios, bốn route Manager, chặn Staff/Owner/ADMIN, endpoint workspace qua JWT/membership và trường hợp lỗi. Kiểm thử DB dùng mock; chưa chứng minh kết nối dữ liệu thực hay migration trên Aiven. Chưa thực hiện bất kỳ lệnh DB hoặc migration nào trong lượt tích hợp này.

Các việc ngoài phạm vi còn lại: luồng phát hành/refresh/logout JWT hiện chưa có trong nhánh; khi thêm cần xóa cache workspace/inventory lúc đổi phiên. Cơ chế lưu token localStorage hiện có được giữ nguyên, không mở rộng. Sales vẫn có scope cấu hình của riêng mình và chưa được chuyển sang workspace động. Build hiện có cảnh báo kích thước bundle trên 500 kB.
