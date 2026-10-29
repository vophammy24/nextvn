# Sales workflow audit — 28/10/2026

Phạm vi: source trên nhánh `develop`, Prisma 8 contract hiện tại, không thay đổi dữ liệu. Trạng thái dưới đây chỉ là kết luận từ code trừ khi ghi rõ đã chạy PostgreSQL. Working tree đã có thay đổi Admin/auth/Manager từ trước; không reset hoặc ghi đè.

## Trace hiện tại

`POSPage` chọn MenuItem từ Menu API theo branch của `/workspace`; cart trong Zustand. `createOrder` gửi `POST /api/business/:businessId/orders` với `branchId`, `shiftId` optional, `tableId` optional, `orderType`, items, paymentMethod. Middleware JWT + membership kiểm tra business/branch; controller kiểm tra Branch ownership. `orders.service.createOrderInTransaction` tải giá món từ DB, tính subtotal/discount/total, tạo Order `CONFIRMED`, OrderItems, OrderPayment, đổi Order `PAID`, gọi `notifyInventoryConsumption`. InventoryService.consumeSale ghi stock ledger có key `sale:orderId` trong cùng giao dịch. UI xóa cart và invalidate toàn bộ queries khi thành công.

## Kết quả 12 câu hỏi

| #                           | Kết quả                     | Bằng chứng                                                                                                                                                               |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Đơn không thanh toán     | **PARTIAL**                 | Contract có OPEN/CONFIRMED; POST hiện luôn tạo Payment và PAID, không có POST lưu unpaid.                                                                                |
| 2. Sửa đơn unpaid           | **NOT IMPLEMENTED**         | Orders router chỉ POST/GET/PATCH status; không có sửa items/tổng, revision.                                                                                              |
| 3. Gắn bàn                  | **PARTIAL**                 | Order.tableId nullable; POST chấp nhận tableId hợp branch nhưng không chặn bàn bận/disabled, không giữ chỗ.                                                              |
| 4. Tạo bàn/khu vực          | **PASS (cơ bản)**           | POST area/table tồn tại, table kiểm tra area cùng branch. Chưa có rename/deactivate/uniqueness.                                                                          |
| 5. Chuyển bàn               | **NOT IMPLEMENTED**         | Không có endpoint transfer.                                                                                                                                              |
| 6. Checkout cần ca active   | **FAIL**                    | shiftId optional; service chỉ validate nếu gửi; POST vẫn thanh toán không cần ca.                                                                                        |
| 7. Thời điểm trừ kho        | **PASS (quy tắc hiện tại)** | Khi Order PAID, notifyInventoryConsumption trong transaction; không trừ lúc tạo OPEN.                                                                                    |
| 8. Thanh toán trùng         | **PARTIAL / FAIL**          | status PATCH có row lock và stock replay theo orderId; `POST /orders` trùng payload tạo orderId mới, payment và stock mới (MGR-12 đã tái hiện).                          |
| 9. Ca cập nhật              | **PARTIAL**                 | Summary tính từ Order.status PAID; POS invalidate tất cả queries sau POST. Shift page không poll, không tự cập nhật khi thiết bị khác ghi.                               |
| 10. Tổng và doanh thu       | **PARTIAL**                 | Giá món authoritative; tổng trừ discount không giới hạn discount <= subtotal. Shift tính total của paid orders và tổng payment theo method; chưa tách payment shift.     |
| 11. Cấu hình từng chi nhánh | **NOT IMPLEMENTED**         | Branch không có sales settings, POS luôn hiển thị DINE_IN/TAKEAWAY.                                                                                                      |
| 12. Chức năng thiếu         | **FAIL**                    | Unpaid flow, pay/cancel riêng, order edit/revision, table occupancy/transfer, config, live shift, area/table lifecycle và distinct payment confirmation chưa hoàn chỉnh. |

## Contract, quyền và dữ liệu

`Order` có branchId/tableId?/shiftId?, cashierId, orderType DINE_IN|TAKEAWAY, status OPEN|CONFIRMED|PAID|CANCELLED, total, items/payments. `OrderPayment` lưu method CASH|BANK_TRANSFER, amount, không có status hoặc payment shift. `RestaurantTable.status` là mutable AVAILABLE/OCCUPIED/RESERVED/CLEANING/NEED_PAYMENT; không được đồng bộ nguyên tử với Order. `RestaurantArea` chưa có active flag. `Shift` có ACTIVE/CLOSED, staffId, timestamps. `Branch` chưa có sales config. Contract/migration đang do `prisma contract emit` và `prisma db init --dry-run` quản lý; migration app cuối là `20261027T0708_password_reset`.

Auth bảo vệ route theo business membership, nhưng table/shift service chưa có policy riêng giữa Owner/Manager/Staff; table routes cho mọi member ghi status/area/table. `System Admin` không có membership tenant mặc định. `getOrders` tải toàn bộ branch rồi phân trang trong bộ nhớ. `getTableCurrentOrder` chọn order đầu tiên OPEN/CONFIRMED nhưng không enforce một open order. `endShift` không kiểm tra unpaid orders. Các chỗ này cần sửa có tests/RBAC rõ trước khi kích hoạt UI.

## Trạng thái kiểm thử

Code audit baseline: hoàn thành. Sau audit, migration Sales đã được chạy trên PostgreSQL cô lập (30 bảng), HTTP/JWT/Prisma 8 integration đã PASS cho cấu hình, đơn chờ trả tiền, checkout ngay, trả tiền sau, bàn, ca và kho. Browser preview đã chụp 5 route × 6 độ rộng và Owner ở 1366px; đây là kiểm tra giao diện với API giả lập được cô lập, không phải bằng chứng PostgreSQL. Các kết quả sau triển khai nằm trong `sales-workflow-test-report.md`.
