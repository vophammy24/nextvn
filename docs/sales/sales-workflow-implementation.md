# Sales implementation status — 28/10/2026

Xem `sales-workflow-audit.md` và `sales-workflow-architecture.md`. Tài liệu này ghi rõ phần nào đã được triển khai sau từng phase; không xem tài liệu thiết kế là chức năng đã chạy.

| Phase                   | Trạng thái | Bằng chứng                                                                                                                                                     |
| ----------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Audit                | PASS       | Trace và 12 câu hỏi baseline trong `sales-workflow-audit.md`.                                                                                                  |
| 2. Cấu hình chi nhánh   | PASS       | `BranchSalesSettings`; Owner chọn chi nhánh, Manager chỉ chi nhánh được gán, Staff chỉ đọc; API kiểm tra tổ hợp và đơn bàn còn mở.                             |
| 3. Đơn và thanh toán    | PASS       | Order `OPEN` lưu riêng; `/checkout` thu tiền ngay nguyên tử; `/orders/:id/pay` thu tiền sau; key tạo đơn và revision.                                          |
| 4. Quầy                 | PASS       | Takeaway và dine-in tại quầy không cần bàn; immediate checkout hoặc trả sau theo cấu hình, thử trên PostgreSQL cô lập.                                         |
| 5. Khu vực/bàn          | PASS       | API tạo, đổi tên, ngừng/bật khu vực và bàn; tên không trùng, không xóa lịch sử.                                                                                |
| 6. Phục vụ tại bàn      | PASS       | Bàn trống → đơn OPEN → thêm món → chuyển bàn → trả tiền → bàn trống; thử hai yêu cầu tranh một bàn.                                                            |
| 7. Kho                  | PASS       | Lưu/sửa/chuyển/hủy unpaid không trừ kho; thanh toán trừ theo recipe trong transaction; thiếu kho rollback; payment song song chỉ ghi một lần.                  |
| 8. Ca trực              | PASS       | Summary từ DB tách ca tạo đơn/ca thu tiền, payment lịch sử fallback, giao dịch gần đây, poll 10 giây; chặn đóng ca còn unpaid.                                 |
| 9. UI                   | PASS       | 5 route × 6 độ rộng, Owner settings/tables 1366px; Chrome/Express/JWT/PostgreSQL cô lập xác nhận POS checkout, Orders/Tables/Shift và cập nhật giữa hai phiên. |
| 10. Security/regression | PASS       | HTTP/JWT/PostgreSQL cô lập kiểm tra quyền, cross-branch, legacy writes 410; test/build dự án; read-only preservation check sau migration demo/staging.         |

## API và UI

`/api/business/:businessId/sales/:branchId` gồm settings, catalog, areas, tables, orders, checkout, payment, cancel, transfer và shift summary. Danh sách đơn lọc status, page, limit, q ở máy chủ. Legacy GET order/table giữ đọc lịch sử; các mutation cũ trả 410. UI `/app/pos`, `/app/tables`, `/app/orders`, `/app/shift`, `/app/sales-settings` dùng `StaffLayout` và Button/Input/Select/Modal/card/badge/table cùng tokens hiện hữu.

## Giới hạn

`Order.status` cũ vẫn gộp lifecycle và payment; UI suy ra unpaid từ OPEN/CONFIRMED và paid từ PAID. Chưa có fulfillment state tách biệt hoặc snapshot version recipe để báo cáo giá vốn lịch sử. `OrderPayment` chưa có unique database constraint trên orderId; branch lock, status check và inventory idempotency key đã qua thử nghiệm song song. Browser preview không phải bằng chứng PostgreSQL.
