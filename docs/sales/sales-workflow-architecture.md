# Sales workflow architecture — 28/10/2026

## Quy tắc miền

Giữ OrderStatus cũ: `OPEN` và `CONFIRMED` là chưa thanh toán; `PAID` là đã thanh toán/đóng; `CANCELLED` là hủy. UI phân loại theo payment status suy ra từ `PAID` và OrderPayment, không thay enum hoặc viết lại đơn lịch sử. `OrderType` DINE_IN/TAKEAWAY tiếp tục mô tả dịch vụ; orderingMode COUNTER/TABLE là khía cạnh riêng. Bàn nullable cho takeaway hoặc dine-in tại quầy. Shift gốc trên Order; ca thu tiền trên OrderPayment mới, fallback shift gốc cho payment lịch sử.

Config 1:1 theo Branch: serviceType TAKEAWAY/DINE_IN/BOTH, counterPayment IMMEDIATE_ONLY/PAY_LATER_ALLOWED/STAFF_CHOICE, dineInMode COUNTER_ONLY/TABLE_ONLY/BOTH. Default tương thích flow cũ `BOTH/IMMEDIATE_ONLY/BOTH`; khi không có settings row, đọc default mà không ghi vào dữ liệu cũ. Staff chỉ đọc; Owner cập nhật branch thuộc business; Manager cập nhật assigned branch; Admin nền tảng không có quyền sales tenant.

Tạo đơn phải lấy giá từ MenuItem, kiểm tra active shift, config, mode, active table/area và tình trạng bàn. Mọi thao tác ghi Sales khóa row Branch (`FOR UPDATE`) trong transaction, vì vậy hai yêu cầu trên cùng chi nhánh được tuần tự hóa trước khi kiểm tra bàn/đơn. Với table order, kiểm tra không có Order OPEN/CONFIRMED cùng table sau khi nhận khóa Branch. Sửa đơn dùng revision từ client; mismatch trả 409. Trả tiền kiểm tra unpaid, tạo đúng một OrderPayment và đổi PAID trong cùng transaction với stock consumption. Key `sale:orderId` ở inventory ledger giữ exactly-once deduction. `requestKey` tạo đơn ngăn retry POST tạo order khác; GET theo request key giúp đối chiếu khi mạng mất phản hồi. Chuyển bàn kiểm tra đích trống trong cùng Branch transaction; không chạm item/stock/payment.

Đơn tại quầy với `paymentTiming=NOW` dùng `/checkout` để tạo đơn, ghi nhận tiền đã được nhân viên xác nhận và trừ kho trong một transaction. `expectedTotal` phải khớp giá máy chủ, nếu khác toàn bộ giao dịch rollback. Đơn tại bàn hoặc quầy trả sau dùng `/orders` để lưu `OPEN`, sau đó `/orders/:id/pay`. Endpoint cũ ghi ngay `/orders` và PATCH status đã trả 410 để không đi vòng qua chính sách mới; GET cũ vẫn đọc được đơn lịch sử.

Không tự động đánh dấu BANK_TRANSFER thành công khi chọn phương thức; UI yêu cầu xác nhận thủ công rõ ràng. Không có tích hợp provider; staff chịu trách nhiệm xác nhận đã nhận tiền. Không trả tiền cho đơn có tổng/stock không hợp lệ. Không trừ kho khi lưu/sửa/chuyển bàn/hủy unpaid.

Table availability suy ra từ open order; `RestaurantTable.status` cũ được giữ cho RESERVED/CLEANING và lịch sử, nhưng OCCUPIED/NEED_PAYMENT UI phải theo order thực tế. Area/Table thêm `isActive`; không xóa cứng. Đổi config tắt table service khi còn open table order trả 409. Kết thúc ca có unpaid thuộc ca bị chặn; không tự chuyển/ghi nhận tiền vào ca khác.

Shift summary: order count và unpaid theo origin shift; collected revenue theo payment collection shift, chỉ payment thực đã tạo sau xác nhận; cash/bank theo method. UI invalidate ngay sau mutations, poll 10 giây khi trang visible, refetch khi focus, manual refresh. Không dùng polling dày khi tab ẩn.

## An toàn triển khai

Schema/contract thay đổi cộng thêm; migration chỉ chạy trên DB test cô lập trước. Không apply lên Aiven production, không đổi SSL, không reset dữ liệu. Sau migration phải emit Prisma 8 contract và chạy client/server tests, real PostgreSQL integration, browser ở 1920/1366/1024/768/390/360. Chỉ kích hoạt UI khi API tương ứng pass. Báo cáo hiện trạng ở `sales-workflow-audit.md`; kế hoạch migration ở `sales-workflow-migration-plan.md`.
