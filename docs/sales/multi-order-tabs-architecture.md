# Kiến trúc 5 tab đơn bán — 28/10/2026

POS dùng `POSWorkspace` giữ tối đa `MAX_SALES_TABS = 5` tab trong một state. Mỗi tab giữ giỏ, số lượng, modifier, ghi chú món/đơn, giảm giá, loại phục vụ, cách gọi món, bàn được chọn, thời điểm/phương thức thu tiền, nhãn, thời gian tạo/cập nhật, `orderId` và `savedRevision`. `requestKey` của đơn mới là UUID cố định của tab. Chuyển tab chỉ đổi `activeId`; các panel vẫn mounted nên không mất thao tác đang làm.

## Nháp và đơn đã lưu

- Tab nháp không tạo Order trong PostgreSQL, không giữ bàn, không trừ kho hoặc ghi doanh thu.
- Tab đã lưu tham chiếu `orderId` thật. Mở lại cùng ID từ Orders/Tables tập trung vào tab đang có. Nếu chưa có tab và đủ chỗ, POS tạo tab rồi tải đơn từ API.
- Khi tải đơn đã lưu, POS lấy trạng thái chuẩn từ máy chủ. Nếu revision khác revision lúc lưu nháp, POS khóa sửa/thu tiền và yêu cầu tải lại; `PATCH` backend vẫn kiểm tra revision để chặn ghi đè đồng thời.
- Trước lưu/checkout, POS tải lại catalog và so sánh món, modifier và giá với ước tính đang hiển thị. Backend tiếp tục tính giá chính thức, kiểm tra quyền/bàn, request key và payment/inventory transaction.
- Đóng tab đơn đã lưu chỉ đóng giao diện; không gọi API hủy. Thanh toán Tab A chỉ cập nhật A và invalidate Orders/Tables/Shift; các tab còn lại giữ nguyên.

## Phục hồi và phạm vi

`salesDraftTabs.ts` lưu bản nháp trong `sessionStorage` với khóa gồm user ID, business ID và branch ID. Dữ liệu phải qua schema Zod version 1, tối đa 5 tab, UUID hợp lệ, không trùng ID/Order ID và tuổi tối đa 24 giờ; dữ liệu lỗi/hết hạn bị loại. Không lưu JWT, mật khẩu hoặc thông tin thanh toán. Ghi chú vận hành nằm trong bản nháp của phiên trình duyệt, nên người dùng không nên ghi thông tin cá nhân nhạy cảm vào ghi chú. Logout và HTTP 401 xóa toàn bộ khóa nháp NextVN.

Khi storage không khả dụng, tab vẫn hoạt động trong bộ nhớ nhưng không phục hồi sau refresh. Đóng tab còn giỏ hoặc đơn đã lưu yêu cầu xác nhận; tab trống hoặc đã thanh toán đóng ngay. Khi đủ 5 tab, nút tạo mới bị khóa và hiển thị lý do. URL `?order=` và `?tableId=` là ý định mở tab, không phải thao tác ghi DB.

## Giới hạn

Tab chỉ đồng bộ trong một phiên trình duyệt; không chia sẻ nháp chưa lưu giữa thiết bị. Bàn được chọn trong nháp có thể bị thiết bị khác chiếm trước khi lưu; API trả conflict để chọn lại. Không có thay đổi schema/migration hoặc quy tắc thanh toán, kho, ca trong đợt UI này.
