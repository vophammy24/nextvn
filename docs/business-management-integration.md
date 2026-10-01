# Tích hợp quản trị doanh nghiệp

Nguồn Member 3: fa6c4a9. Nền tích hợp: develop 4f18a5d.

## Kiến trúc

- Dùng JWT authenticate → resolveMembership → OWNER; trạng thái BusinessMember.isActive và User.status được kiểm tra trước mọi API Owner. Quyền ADMIN nền tảng không cấp quyền OWNER.
- Không dùng JWT Owner riêng, /api/dev/session, token thử nghiệm hoặc sessionStorage Owner.
- Frontend lấy business từ WorkspaceProvider; TanStack Query phân tách khóa dữ liệu theo business, trang và kỳ. API dùng interceptor xác thực hiện tại.
- Giữ nguyên POS, Tables, Orders, Shift, các module Inventory/Recipe và trang Owner Inventory. Tái sử dụng StaffLayout, StatCard, StatusBadge, AnalyticsChart/ChartCard và bộ định dạng vi-VN/VND.

## Đường dẫn

Các trang /app/owner, /branches, /revenue, /menu-profit, /promotions, /users, /settings, /subscription dùng cùng workspace Owner. /app/owner/team và /analytics chuyển hướng tới /users và /revenue. /app/owner/inventory giữ trang Member 2.

API dưới /api/business/:businessId/owner:

- GET overview, revenue, menu-profit, promotions
- GET/POST branches; PATCH branches/:id (ngừng hoạt động thay vì xóa dữ liệu liên quan)
- GET members; PATCH members/:id (STAFF/MANAGER, isActive, branchId)
- POST members trả INVITATIONS_NOT_CONFIGURED khi chưa có dịch vụ mời; không tạo tài khoản giả
- GET/PATCH settings: tên Business và BusinessSettings cập nhật trong cùng giao dịch
- GET subscription: BusinessSubscription, SubscriptionPlan và BillingRecord từ DB
- POST subscription/checkout trả PROVIDER_NOT_CONFIGURED; không giả lập thanh toán

## Dữ liệu và phạm vi

Doanh thu được tính từ Order đã PAID thuộc các chi nhánh của business, theo ngày tạo đơn và múi giờ Việt Nam; kỳ tuần/tháng/quý là 7/30/90 ngày lùi từ hiện tại. Giảm giá được phân bổ tỷ lệ trên giá trị món. Không có đơn thì trả số không/danh sách rỗng.

Lợi nhuận món là ước tính theo công thức cơ bản và giá nguyên liệu hiện tại, chưa bao gồm tùy chọn món hoặc giá vốn lịch sử. Thiếu công thức thì trả trạng thái chưa đủ dữ liệu. Tái sử dụng InventoryService của Member 2 để tính chi phí. Gợi ý bán hàng là quy tắc dựa trên món bán chạy, không phải AI.

## Schema bổ sung

BusinessSettings (một bản ghi/business), SubscriptionPlan, BusinessSubscription và BillingRecord; enum SubscriptionStatus, BillingStatus. Giữ nguyên BusinessMember.isActive/branchId và toàn bộ schema Sales/Inventory. SaaS billing không dùng OrderPayment; POS vẫn CASH/BANK_TRANSFER.

## Giới hạn còn lại

- Chưa triển khai email mời tài khoản, thanh toán payOS, webhook, kích hoạt/gia hạn gói hoặc dữ liệu gói mẫu.
- Phân tích theo danh mục, người quản lý/doanh thu trên bảng chi nhánh và thời điểm đăng nhập thành viên chưa kết nối; hiển thị chưa có dữ liệu.
- Analytics hiện đọc đơn theo chi nhánh và tổng hợp trong ứng dụng; cần phân trang/tổng hợp DB khi dữ liệu lớn.
- Đọc chi phí công thức hiện dùng giao dịch kho với khóa chi nhánh của Member 2; cần tối ưu bộ đọc báo cáo khi tải lớn.
- Không thay kiến trúc xác thực hoặc token persistence hiện tại của develop. Sales còn cấu hình phạm vi bằng biến môi trường; đây là nợ kỹ thuật có sẵn, ngoài tích hợp Owner.
- Các kiểm thử dùng dữ liệu giả lập cô lập; không có fixture/in-memory Owner trong luồng production.

## Xác minh

Các kiểm thử hành vi bao gồm phân quyền trực tiếp, cách ly business, quyền thành viên, cài đặt giao dịch, analytics từ dữ liệu đọc, trạng thái rỗng/lỗi, subscription, payOS chưa cấu hình và hồi quy Sales/Inventory/Workspace. DB chỉ được áp dụng sau khi check/build/tests và kiểm tra kế hoạch cộng thêm thành công.

## DB đã áp dụng ngày 01/10/2026

Sau khi check và audit production thành công, db:init thực thi 17/17 thao tác cộng thêm. db:status trả exit 0, currentContract bằng targetContract: b8c5824188dbb136758cc9824758c961c7e5755001b36d482f99dd032b48922b. Công cụ báo No migrations found vì luồng db:init cập nhật schema và ref trực tiếp, không tạo chuỗi migration.

1. CREATE TABLE BillingRecord (kèm khóa chính và CHECK BillingStatus).
2. CREATE TABLE BusinessSettings (khóa chính businessId).
3. CREATE TABLE BusinessSubscription (kèm khóa chính và CHECK SubscriptionStatus).
4. CREATE TABLE SubscriptionPlan (kèm khóa chính).
5. UNIQUE BillingRecord.providerReference.
6. UNIQUE BillingRecord.providerEventId.
7. UNIQUE BusinessSubscription.businessId.
8. UNIQUE SubscriptionPlan.code.
9. INDEX BillingRecord_businessId_createdAt_idx_776e65e5 (businessId, createdAt).
10. INDEX BillingRecord_businessId_idx_ae0ed511 (businessId).
11. INDEX BillingRecord_subscriptionId_idx_edbe96bf (subscriptionId).
12. INDEX BusinessSubscription_planId_idx_5b32079a (planId).
13. FK BillingRecord.businessId → Business.id.
14. FK BillingRecord.subscriptionId → BusinessSubscription.id.
15. FK BusinessSettings.businessId → Business.id.
16. FK BusinessSubscription.businessId → Business.id.
17. FK BusinessSubscription.planId → SubscriptionPlan.id.

Không có DROP TABLE, DROP COLUMN, chuyển kiểu phá hủy hoặc thay đổi bảng Sales/Inventory hiện hữu.
