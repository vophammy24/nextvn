# Sales UI redesign — 28/10/2026

## Cấu trúc sau thay đổi

| Trang         | Thay đổi giao diện                                                                                                                                                       | Thành phần hiện có dùng lại                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| POS           | Thanh 5 tab có tên/số món/dấu chưa lưu; tìm món, chip danh mục, lưới món và giỏ; nút lựa chọn phục vụ/thu tiền; bàn trống chọn bằng nút; liên kết “Xem giỏ” trên mobile. | AppShell/StaffLayout, Button, Input, Select trong modal thu tiền, Modal, card/badge, Lucide, design tokens. |
| Tables        | Khu vực dạng chip cuộn ngang; card bàn giữ trạng thái, số đơn, tiền chưa thu và hành động mở/xem/thêm món.                                                               | Card, Button, Select chi nhánh Owner, badge, Modal.                                                         |
| Orders        | Ba nút trạng thái thay dropdown, tìm mã đơn; ngày lọc đặt trong phần mở rộng; bàn đích khi chuyển dạng lưới trực quan. Sửa món mở hoặc tập trung tab POS.                | Button, Input, Modal, bảng, badge, API phân trang.                                                          |
| Shift         | Nhãn “Mở ca”/“Đóng ca” rõ ràng; giữ KPI, thời gian cập nhật, polling 10 giây và nút làm mới từ backend.                                                                  | Stat/card, Button, Modal, bảng, shared shell.                                                               |
| Configuration | Radio card theo từng bước cho loại phục vụ, cách gọi món và chính sách quầy; hiển thị khu vực/bàn khi có phục vụ bàn và bản xem trước hành vi.                           | Button, Select chi nhánh, card, shared typography/tokens.                                                   |

Các lựa chọn ít gặp như ghi chú/giảm giá vẫn có sẵn. Quyền Owner/Manager/Staff, trạng thái bàn, thanh toán và kho tiếp tục được backend xác thực. Không thêm theme hoặc thư viện UI mới. API catalog chỉ thêm `categoryName`; API danh sách đơn thêm `dateFrom/dateTo` được lọc tại máy chủ, giữ phân trang và tenant scope.

Ảnh trước thay đổi: `docs/sales/browser-captures/`. Ảnh sau thay đổi: `docs/sales/browser-captures-ui-after/`. Ảnh preview dùng API giả lập chỉ để so sánh giao diện; HTTP/PostgreSQL thật được kiểm tra riêng theo `sales-ui-test-report.md`.
