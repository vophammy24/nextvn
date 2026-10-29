# Sales migration plan — 28/10/2026

## Phạm vi cộng thêm

1. `BranchSalesSettings` 1:1 Branch, defaults tương thích cũ; không backfill bắt buộc.
2. `Order`: nullable `orderingMode`, nullable stable `requestKey` + `requestHash`, `revision` default 1. Legacy order giữ nguyên status/type/total.
3. `RestaurantArea` và `RestaurantTable`: `isActive` default true. Không xóa status cũ.
4. `OrderItem`: optional modifiers snapshot nếu API mới hỗ trợ selection; không cập nhật item của đơn PAID.
5. `OrderPayment`: optional `shiftId` (ca thu tiền), optional `confirmedBy`; fallback legacy reporting theo Order.shiftId. Cần kiểm tra duplicate historical payments trước khi thêm unique(orderId).

## Quy trình an toàn

- Kiểm tra schema/migration marker và đếm trạng thái đơn, duplicate payments, bàn có nhiều open order (chỉ đọc). Snapshot ngày 28/10/2026 trên Aiven demo/staging: PAID 484, CANCELLED 14, OPEN/CONFIRMED 0, duplicate payment orders 0, multiple open orders/table 0.
- Tạo một database test riêng trên demo/staging hoặc PostgreSQL cục bộ, không dùng database ứng dụng đang chạy. Áp contract mới trên đó bằng Prisma 8 CLI; test CRUD, rollback, concurrency hai kết nối thật và so sánh contract hash.
- Sinh migration bằng công cụ Prisma 8 của repo; lưu ops/migration files, không sửa migration đã áp dụng. Test upgrade bản sao schema/dữ liệu legacy và rollback/recovery trước khi đề xuất chạy trên production.
- Khi triển khai sau phê duyệt: backup, kiểm tra no duplicate/open conflicts và status marker; chạy additive migration trong maintenance window; emit/check contract; deploy backend tương thích trước frontend; quan sát errors, financial totals và stock ledger; có runbook phục hồi dữ liệu từ backup nếu migration lỗi. Không chạy production migration trong task này.

## Đã thực hiện trên demo/staging (28/10/2026)

- User đã xác nhận Aiven hiện cấu hình là demo/staging. Read-only preflight: 484 PAID, 14 CANCELLED, 0 OPEN, 0 payment trùng, 0 bàn nhiều đơn mở.
- Prisma status trước apply: đúng một migration pending `20261028T0814_sales_workflow`, 14 additive operations. Migration đã PASS trên database PostgreSQL cô lập và HTTP integration trước khi áp lên database ứng dụng demo/staging.
- Chạy targeted `prisma db migrate --to 804f0a9d537861a44375660fd10a928720d5efbca35e3b0325188ec29f7bee22` trên **demo/staging**, kết quả 1 migration / 14 operations. Status sau apply: Up to date. Read-only schema check: 498 legacy orders còn nguyên, 0 revision lỗi, 0 keyed order cũ; aggregate statuses và duplicate counts không đổi.
- Không chạy migration này trên production, không reset/reseed, không đổi TLS hay secret. Database thử nghiệm cô lập đã được xóa sau khi toàn bộ integration PASS; marker tạm cũng đã được dọn. Muốn chạy lại integration phải tạo và migrate một database thử nghiệm mới bằng `scripts/sales-isolated-db.ts`.

## Production khi được triển khai riêng

1. Sao lưu và thử khôi phục bản sao; kiểm tra `prisma migration status` đúng đường từ contract `2baf5e4…` tới `804f0a9…` và không có migration khác pending.
2. Chạy audit chỉ đọc; dừng nếu có duplicate payment, bàn nhiều open order hoặc schema drift. Lập maintenance window vì thêm cột/default/index có thể khóa bảng ngắn hạn.
3. Áp chính migration targeted ở trên vào production theo quy trình phát hành riêng; xác nhận marker và số lượng/status đơn giữ nguyên; chạy script read-only với cờ phù hợp thay vì thử tạo đơn thật.
4. Deploy backend và frontend cùng phiên bản contract; smoke auth/Owner config/Staff POS trên tenant thử nghiệm được cấp phép; giám sát payment, stock ledger và lỗi 409/503.
5. Nếu migration lỗi, dừng rollout và phục hồi từ backup/snapshot theo runbook cơ sở dữ liệu. Không xóa cột mới khi có đơn mới đã ghi. Legacy mutation endpoints trả 410 sau deploy, vì vậy client cũ cần nâng cấp cùng thời điểm.

## Điều kiện chặn

Nếu không thể tạo hoặc kết nối database test cô lập, hoặc migration plan yêu cầu viết lại enum/đơn PAID, dừng apply migration và không bật API phụ thuộc schema. Không dùng mocks để tuyên bố PostgreSQL integration PASS.
