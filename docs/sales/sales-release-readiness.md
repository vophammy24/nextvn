# Sales release readiness — 28/10/2026

**Code và database demo/staging: READY FOR MANUAL SMOKE. Production release: BLOCKED theo yêu cầu không deploy/migrate production trong task này.**

Đã hoàn thành UI/API, Prisma 8 additive migration trên PostgreSQL cô lập và database ứng dụng demo/staging đã được user xác nhận, HTTP integration và Chrome end-to-end với Express/JWT/PostgreSQL trên DB cô lập, regression `npm run check`, ảnh browser preview và read-only preservation check 498 đơn lịch sử. Database thử nghiệm đã được xóa. Legacy write endpoints trả 410 nên ứng dụng client/server phải cập nhật đồng thời; GET cũ vẫn đọc lịch sử. Không commit, push hoặc deploy.

## Gate còn lại trước production

1. Sao lưu/khôi phục thử và thực hiện migration targeted trong đợt phát hành riêng; production chưa được migrate.
2. Chạy manual smoke trên demo/staging với tenant thử nghiệm được cấp phép và xác nhận quy trình thu tiền thủ công. Chrome end-to-end tự động đã chạy với backend và PostgreSQL thật trên database cô lập; ảnh responsive dùng API preview cô lập.
3. Quan sát sau deploy: tiền thu theo ca, số OrderPayment/order, ledger `sale:orderId`, số lỗi 409/503, thời gian phản hồi polling.
4. Xem xét unique constraint OrderPayment(orderId) và index hỗ trợ open-order/table sau khi kiểm tra toàn bộ production. App-level Branch row lock và inventory idempotency đã được test song song, nhưng database constraint sẽ tăng độ bền nếu có writer ngoài Sales API.
5. Chưa có snapshot recipe version khi bán; không tuyên bố giá vốn lịch sử bất biến nếu báo cáo cũ đang tính theo recipe hiện hành.
