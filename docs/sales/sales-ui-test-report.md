# Sales UI test report — 28/10/2026

## Bằng chứng

- `npm test -w client -- --run src/tests/sales-pos.test.tsx`: 12/12 PASS. Kiểm tra giới hạn 5 tab, giỏ/ghi chú/quantity/modifier độc lập, phục hồi sau refresh, phạm vi user/branch, dữ liệu hết hạn, liên kết Order sai, xác nhận đóng, mở lại đơn không tạo tab trùng, giữ Tab B khi Tab A lưu/thu tiền, phát hiện giá đổi và revision cũ.
- `RUN_SALES_ISOLATED_DB=true npm exec -w server -- tsx scripts/verify-sales-isolated.ts`: PASS trên PostgreSQL cô lập. Có kiểm tra lọc ngày ở máy chủ, ngày không hợp lệ, phân trang/tìm mã, quyền, đơn chờ, chuyển bàn, thanh toán, kho, ca.
- `RUN_SALES_ISOLATED_DB=true npm exec -w server -- tsx scripts/verify-sales-browser-isolated.ts`: PASS Chrome + Vite + Express/JWT + PostgreSQL thật trên database cô lập: POS checkout, payment/stock, Orders/Tables/Shift và polling giữa hai cửa sổ. Database thử nghiệm đã xóa sau khi kiểm tra.
- `node docs/sales/sales-ui-browser-audit.cjs`: PASS 5 route ở 1920/1366/1024/768/390/360px, thêm 6 ảnh POS nhiều tab và 2 ảnh Owner; không lỗi trang/tràn ngang; bàn phím ArrowLeft đổi tab, refresh phục hồi 3 tab. Tổng 38 ảnh sau thay đổi trong `browser-captures-ui-after/`; 32 ảnh trước trong `browser-captures/`. Bài này dùng API preview để kiểm tra giao diện, không dùng làm bằng chứng PostgreSQL.

## Phạm vi theo kịch bản

| Nhóm                                                     | Kết quả | Bằng chứng/giới hạn                                                                                                                 |
| -------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1–5: tạo tab, giới hạn, giỏ/quantity/notes/modifiers     | PASS    | Component tests với tab độc lập; chuyển tab và remount.                                                                             |
| 6–8: phục hồi, đóng trống, xác nhận bỏ nháp              | PASS    | Component tests và Chrome refresh.                                                                                                  |
| 9–12: đóng tab đã lưu, mở trùng, lưu/thu Tab A giữ Tab B | PASS    | Component tests; API không hủy Order khi đóng tab.                                                                                  |
| 13–15: cô lập, nháp cũ, logout                           | PASS    | Storage scope/Zod/TTL tests; logout và HTTP 401 xóa khóa nháp.                                                                      |
| 16–27: Sales workflow, ca, quyền, cấu hình               | PASS    | PostgreSQL/HTTP/JWT integration trước và sau đợt UI; không đổi quy tắc payment/inventory.                                           |
| 28–32: bàn phím, mobile, responsive, console, phản hồi   | PASS    | Chrome preview 6 độ rộng, keyboard/refresh, không pageerror/console error/overflow; phản hồi mutation trong component/browser thật. |

## Giới hạn

Ảnh responsive dùng API preview; hành vi ghi dữ liệu được xác nhận riêng bằng Chrome trên PostgreSQL cô lập. Chưa chạy thao tác bán hàng trên tenant dùng chung hoặc production. Nháp chỉ thuộc sessionStorage của một tab trình duyệt và không đồng bộ giữa các thiết bị. Owner chưa có phiên POS theo chi nhánh trong `/workspace`; cần thiết kế chọn chi nhánh được backend xác thực nếu Owner phải trực tiếp bán hàng. Danh sách Orders hiển thị phương thức thanh toán trong chi tiết, chưa có cột riêng. Phản hồi mutation dùng badge/status hiện hữu; dự án chưa có shared toast. Browser tự động dùng Chrome cài trong workspace; môi trường CI khác cần cấu hình trình duyệt tương ứng.

`npm run check` PASS: Prettier, client/server lint, client/server typecheck, client **134/134**, server **193/193**, client/server build. Lint còn 3 warning `react(set-state-in-effect)` ở SalesPOS/SalesSettings, không có lint error. Vite cảnh báo chunk JavaScript trên 500 kB. `git diff --check` PASS; chỉ có cảnh báo line ending ở hai file cũ ngoài phạm vi Sales. Không commit, push, deploy hoặc migrate production.
