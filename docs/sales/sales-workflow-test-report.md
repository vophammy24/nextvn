# Sales test report — 28/10/2026

## Môi trường và bằng chứng

- Kiểm thử ghi dữ liệu chạy **chỉ trên database PostgreSQL cô lập** `nextvn_sales_test_<random>` trên cụm Aiven demo/staging. Migration Prisma 8 Sales (14 additive operations) tạo schema 30 bảng và `BranchSalesSettings` tại đó. Không test bằng dữ liệu ứng dụng đang dùng.
- Database thử nghiệm cô lập đã được xóa sau khi integration cuối PASS; chỉ database ứng dụng demo/staging giữ migration Sales.
- `RUN_SALES_ISOLATED_DB=true npm exec -w server -- tsx scripts/verify-sales-isolated.ts`: PASS HTTP/JWT/Prisma 8/PostgreSQL, dữ liệu synthetic. Script không in URL/credential. Test kiểm tra giá, status, payment, stock balance và shift totals trực tiếp trong DB.
- `RUN_SALES_ISOLATED_DB=true npm exec -w server -- tsx scripts/verify-sales-browser-isolated.ts`: PASS Chrome + Vite + Express/JWT + PostgreSQL cô lập, không intercept API. UI tạo và thanh toán đơn; ca trên trình duyệt thứ hai tự cập nhật trong vòng 25 giây. OrderPayment và stock balance được đối chiếu trong DB. Orders/Tables/Shift tải từ API thật; database thử nghiệm đã xóa sau PASS.
- `node docs/sales/sales-browser-audit.cjs`: PASS preview cô lập 5 route × 6 độ rộng (1920/1366/1024/768/390/360), Owner settings/tables 1366px, không lỗi trang hoặc tràn ngang; ảnh trong `browser-captures/`. Một click path checkout qua API intercepted PASS. Preview không chứng minh backend thật.
- Read-only aggregate trên database ứng dụng demo/staging trước migration: 484 PAID, 14 CANCELLED, 0 OPEN/CONFIRMED, 0 đơn có nhiều payment, 0 bàn có nhiều open order, 3 ca ACTIVE.
- Migration targeted trên database ứng dụng **demo/staging đã được user xác nhận**: 1 migration / 14 additive operations, Prisma status sau apply `Up to date`; read-only check sau apply xác nhận 498 legacy orders còn nguyên, 0 revision lỗi, statuses/duplicate counts không đổi. Không chạy production migration.

## Kịch bản yêu cầu

| #     | Trạng thái | Bằng chứng / giới hạn                                                                                                                                                 |
| ----- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–3   | PASS       | Owner PUT TAKEAWAY, DINE_IN, BOTH; invalid config 400; owner UI preview.                                                                                              |
| 4     | PASS       | Manager PUT branch khác 403.                                                                                                                                          |
| 5–7   | PASS       | Takeaway và dine-in counter không bàn; checkout NOW tạo PAID, stock trừ trong transaction; expectedTotal sai rollback. Modifier hợp lệ tăng giá, modifier lạ trả 400. |
| 8–10  | PASS       | Counter OPEN persisted, sửa với revision, paid sửa trả 409.                                                                                                           |
| 11–16 | PASS       | Area/table create, trùng tên 409, table order cần bàn trống, race 201/409, mở unpaid, thêm món giữ orderId, chuyển bàn giữ ID.                                        |
| 17–19 | PASS       | Transfer tới bàn bận/khác branch 409; sau full payment bàn AVAILABLE.                                                                                                 |
| 20–22 | PASS       | Payment song song chỉ một OrderPayment; replay checkout không trừ kho lần hai; thiếu stock 409 giữ OPEN, không payment, stock không đổi.                              |
| 23–27 | PASS       | Shift summary phản ánh unpaid/paid, collected chỉ payment; cash/bank, recent transactions, chặn đóng ca khi còn unpaid rồi đóng được sau pay.                         |
| 28    | PASS       | Hai trang Chrome độc lập dùng cùng backend/PostgreSQL cô lập; trang Shift thấy đơn trả tiền từ POS qua polling, không reload hoặc intercept API.                      |
| 29    | PASS       | `npm test -w client` và `npm test -w server` có regression Staff/Manager/Owner; browser preview shell Manager/Owner.                                                  |
| 30    | PASS       | Recipe/inventory/analytics regression nằm trong bộ test hiện tại; kết quả `npm run check` ghi dưới đây.                                                               |

## Validation cuối

`npm run check` PASS: Prettier, oxlint (6 warning React set-state-in-effect ở 2 trang Sales, không lỗi), TypeScript client/server, client 124/124, server 193/193, client/server build. Vite cảnh báo bundle >500kB; không làm build fail. `git diff --check` PASS; Git chỉ in cảnh báo line ending của hai file cũ không thuộc Sales. Không chạy production migration, push, deploy hoặc commit.
