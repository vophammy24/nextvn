# Kho và công thức — bàn giao Member 2

## Phạm vi và trạng thái tích hợp

Màn hình dùng lại từ `feature/mvp-foundation`: `/app/inventory`, `/app/stock-transactions`, `/app/recipes`, `/app/alerts`. Dùng chung AppShell, DataTable, StatusBadge, biểu mẫu và bộ định dạng tiếng Việt. Không có POS, Order, Shift, Owner UI hay payment mới. Các màn hình ngoài phạm vi được lấy nguyên từ foundation để cung cấp shell và kiểm thử có sẵn, không phải tính năng được triển khai trong lát cắt này.

Nhánh ban đầu chỉ có hợp đồng User/Business/BusinessMember/Branch và API health. Chưa có backend phiên đăng nhập, quyền chi nhánh hay Order/Menu. Vì vậy router kho mặc định trả **401**, không tin role/business/branch grants do trình duyệt gửi. Dữ liệu minh họa chỉ tồn tại trong chế độ xem thử phát triển; lỗi API thật không trả dữ liệu mẫu.

Member 1 nối `createInventoryRouter(service, resolvePrincipal)` trong `app.ts`. Resolver phải kiểm tra phiên, trạng thái tài khoản, membership đang hiệu lực, role nghiệp vụ và danh sách branch grants trên máy chủ. Trả `{ userId, businessId, role, branchIds }` hoặc `null`; không ánh xạ platform ADMIN thành OWNER. Trước khi bật cookie auth, tích hợp chính sách cookie/CSRF và CORS allowlist của Auth; `withCredentials` ở client chỉ là cấu hình vận chuyển, không tự cung cấp bảo vệ CSRF. Không lưu token trong localStorage.

| Quyền          | Kho chi nhánh / sửa dữ liệu | Tổng hợp doanh nghiệp  | Trừ kho qua Sales nội bộ |
| -------------- | --------------------------- | ---------------------- | ------------------------ |
| STAFF          | Không                       | Không                  | Chi nhánh được cấp quyền |
| MANAGER        | Chi nhánh được cấp quyền    | Không                  | Chi nhánh được cấp quyền |
| OWNER          | Không                       | Doanh nghiệp của phiên | Không                    |
| Platform ADMIN | Không tự động được cấp      | Không tự động được cấp | Không                    |

## Mô hình và số lượng

- `Ingredient`: danh mục, đơn vị cơ sở, business/branch; nguyên liệu ở hai chi nhánh là hai bản ghi riêng.
- `InventoryBalance`: một số dư và mức tối thiểu cho mỗi nguyên liệu, đơn giá bình quân hiện tại.
- `InventoryLot`: số lượng còn lại theo lô, ngày hết hạn tùy chọn. Nhập tăng tạo lô; xuất giảm cập nhật lô.
- `Recipe`, `RecipeIngredient`: mã món từ Sales, giá bán dùng cho ước tính, phiên bản, các định lượng chính và tùy chọn. Metadata tùy chọn lưu JSON, định lượng tùy chọn dùng `modifierKey`; chuỗi rỗng biểu thị định lượng chính. Tùy chọn **cộng thêm**, không thay thế công thức. Không tạo bản sao mô hình Menu/Order.
- `StockTransaction`: sổ phát sinh chỉ thêm, có người thực hiện, mã yêu cầu/hash, mã đơn nếu có, ghi chú, nhà cung cấp và JSON các dòng trước/sau, lô bị tác động, đơn giá, phiên bản công thức. Nhập kho lưu cả đơn giá mua quy đổi và đơn giá trước nhập. Tạo/sửa metadata nguyên liệu ghi giao dịch điều chỉnh lượng bằng 0. Không có xóa nguyên liệu/công thức trong API này.
- `InventoryAlert`: một bản ghi cho mỗi điều kiện/nguyên liệu/chi nhánh; trạng thái và cờ điều kiện còn hiệu lực.

Đơn vị đầu vào: `g`, `kg`, `ml`, `L`, `cái`. Chỉ quy đổi kg↔g và L↔ml; không đổi khối lượng sang thể tích. Lưu lượng bằng số nguyên `quantityMilli`: 1 g/ml/cái = 1.000 đơn vị lưu; 1 kg/L = 1.000.000. Cho phép lượng lẻ của cái đến 0,001. Không làm tròn âm thầm các lượng nhỏ hơn độ chính xác này. Giới hạn số dư 2.000.000 đơn vị cơ sở/nguyên liệu. Không đổi loại đơn vị sau khi tạo.

Giá vốn MVP là **bình quân gia quyền di động**, không phải giá vốn riêng của từng lô. Nhập kho tính `(tồn cũ × đơn giá cũ + lượng nhập × đơn giá nhập) / tồn mới`. Giá nhập tương ứng đơn vị đầu vào; chia 1.000 khi nhập theo kg/L. Giá dùng `Float`, kết quả tổng chi phí/lợi nhuận làm tròn hai chữ số; đây là ước tính vận hành, không phải sổ kế toán tiền tệ chính xác tuyệt đối. Điều chỉnh tăng giữ nguyên đơn giá hiện tại; muốn cập nhật giá cần nhập kho.

Server tính `foodCost`, `grossProfit = sellingPrice - foodCost`, `marginPercent` (0 khi giá bán bằng 0). Giá bán của công thức là giá dùng cho phân tích, không tự cập nhật giá tại POS. Sales phải xác nhận `menuItemId` thuộc danh mục doanh nghiệp/chi nhánh khi tích hợp; hiện chưa có bảng Menu để tạo khóa ngoại.

## Quy tắc giao dịch và cảnh báo

IMPORT tăng kho; EXPORT và WASTE giảm kho; ADJUSTMENT nhận **số tồn thực tế cuối cùng**, không phải lượng chênh lệch. Không cho tồn âm. Xuất/bán ưu tiên lô hết hạn sớm (FEFO), rồi ngày tạo và ID; lô không có hạn xếp sau. Không xuất/bán lô đã hết hạn theo ngày Việt Nam. WASTE/ADJUSTMENT được giảm lô hết hạn. Không nhập lô đã hết hạn. Giảm lô và số dư, ghi sổ và đánh giá cảnh báo trong cùng transaction.

`LOW_STOCK`: `0 < stock <= minimum`; `OUT_OF_STOCK`: `stock <= 0`. `NEAR_EXPIRY`: còn lô dương hết hạn không muộn hơn hôm nay + `EXPIRY_WARNING_DAYS` (3), bao gồm lô đã quá hạn để không bỏ sót rủi ro. Mốc ngày theo `Asia/Ho_Chi_Minh`. Trạng thái bảng kho ưu tiên hết hàng → hạn dùng → sắp hết → đủ hàng. Các cảnh báo vẫn độc lập; tổng hợp số nguyên liệu thấp không dựa vào trạng thái ưu tiên này.

Đánh giá sau giao dịch và khi đọc kho/tổng hợp. Không có cron hoặc thông báo đẩy trong phase này. Điều kiện hết hiệu lực tự chuyển RESOLVED; tái xuất hiện mở lại cùng bản ghi. Xử lý thủ công không mở lại liên tục nếu điều kiện chưa từng hết hiệu lực. Không phát sinh DISCREPANCY khi chưa có quy trình so sánh kiểm kê thực tế.

## API HTTP

Tiền tố `/api/inventory`. Business luôn từ principal, không lấy từ request body. IDs của nguyên liệu/công thức/cảnh báo phải nằm trong branch đã kiểm tra. Lỗi gồm `code`, `message` tiếng Việt; lỗi nội bộ trả 503 chung, không lộ chi tiết DB.

| Phương thức | Đường dẫn                             | Nội dung                                                                                |
| ----------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| GET         | `/branches/:branchId`                 | Snapshot gồm `asOf`, ingredients, recipes, 100 giao dịch mới nhất, alerts               |
| POST        | `/branches/:branchId/ingredients`     | `{name,category,unit,minimum,unitCost}`                                                 |
| PATCH       | `/branches/:branchId/ingredients/:id` | Như tạo; không sửa trực tiếp đơn giá                                                    |
| POST        | `/branches/:branchId/transactions`    | `{type,ingredientId,quantity,unit,unitCost?,supplier?,expiry?,reason,note?,requestKey}` |
| POST        | `/branches/:branchId/recipes`         | Recipe DTO bên dưới                                                                     |
| PUT         | `/branches/:branchId/recipes/:id`     | Thay toàn bộ định lượng và tùy chọn, tăng version                                       |
| PATCH       | `/branches/:branchId/alerts/:id`      | `{status: "IN_PROGRESS" \| "RESOLVED"}`                                                 |
| GET         | `/summary`                            | Chỉ OWNER của doanh nghiệp trong phiên                                                  |

IMPORT yêu cầu supplier và unitCost; quantity > 0 trừ ADJUSTMENT cho phép 0. expiry là `YYYY-MM-DD` hoặc null. `SALE_CONSUMPTION` không được chấp nhận qua HTTP. Request key giao dịch thủ công phải được giữ lại khi thử lại sau lỗi mạng; cùng key khác nội dung trả 409. UI giữ key trong bộ nhớ trong thời gian màn hình còn mở, không bảo đảm giữ key qua tải lại trang.

```json
{
  "menuItemId": "ma-mon-tu-sales",
  "name": "Cà phê sữa",
  "sellingPrice": 45000,
  "ingredients": [{ "ingredientId": "uuid-nguyen-lieu", "quantity": 0.018, "unit": "kg" }],
  "modifiers": [
    {
      "key": "them-sua",
      "name": "Thêm sữa",
      "priceExtra": 5000,
      "ingredients": [{ "ingredientId": "uuid-sua", "quantity": 50, "unit": "ml" }]
    }
  ]
}
```

## Sales Operations: hợp đồng gọi nội bộ

Gọi `InventoryService.consumeSale(principal, scope, SaleInput)` từ backend đã xác thực, không từ trình duyệt. Sales chịu trách nhiệm đọc Order thật, xác nhận đã PAID/CONFIRMED, kiểm tra quyền, business/branch, mã món, số lượng và tùy chọn. `SaleInput`:

```ts
{
  orderId: string; // duy nhất trong doanh nghiệp, ổn định qua mọi lần thử lại
  state: 'PAID' | 'CONFIRMED';
  items: { menuItemId: string; quantity: number; modifiers: string[] }[];
}
```

Engine gom định lượng của tất cả món/tùy chọn, khóa hàng Branch bằng `SELECT ... FOR UPDATE` trong transaction Prisma, đọc tồn, cập nhật các lô/số dư, ghi SALE_CONSUMPTION và cảnh báo rồi commit. Bất kỳ nguyên liệu nào thiếu sẽ rollback toàn bộ. Các thao tác cùng chi nhánh được tuần tự hóa; khác chi nhánh có khóa riêng. Không gọi API bên ngoài trong transaction.

Unique `(businessId, branchId, requestKey)` và `(businessId, orderId)` bảo vệ trừ lặp. Hash payload được chuẩn hóa thứ tự dòng/tùy chọn; không chứa state để CONFIRMED → PAID không trừ hai lần. Replay đúng nội dung trả lại giao dịch ban đầu ngay cả khi công thức đã sửa; replay đổi nội dung trả 409. Mã đơn trùng ở chi nhánh khác bị ràng buộc DB chặn và rollback. Giá vốn, phiên bản công thức dùng tại lần xử lý đầu được lưu trong sổ.

**Chưa có transaction chung với Order** vì module đó chưa có trên nhánh. Sales nên ghi sự kiện xác nhận đơn vào outbox trong transaction Order, worker gọi engine với orderId ổn định, chỉ đánh dấu hoàn tất sau thành công. Lỗi tồn/công thức cần đưa vào luồng xử lý nghiệp vụ, không bỏ qua. Nếu cần thanh toán và tồn cùng commit, thống nhất adapter dùng chung transaction trước khi nối. Chưa tự hoàn kho khi hủy/hoàn tiền, chưa giữ tồn cho đơn nháp và chưa hỗ trợ sửa đơn đã tiêu thụ.

## Owner read contract (Member 3)

`GET /api/inventory/summary` trả `{costingMethod: "MOVING_WEIGHTED_AVERAGE", branches: [...]}` chỉ gồm chi nhánh đang hoạt động của doanh nghiệp trong phiên. Mỗi branch có `branch:{id,name}`, `asOf`, `ingredients`, `lowStockCount` (bao gồm hết hàng), `nearExpiryCount`, `inventoryValue`, `consumptionLast30Days`.

Tiêu thụ 30 ngày lấy từ sổ SALE_CONSUMPTION: `{ingredientId,name,unit,quantity,estimatedCost}`, xếp giảm theo chi phí tiêu thụ được ghi tại thời điểm bán. Không cộng g với ml/cái. `inventoryValue` là tổng số lượng × đơn giá bình quân, bao gồm lô quá hạn chưa hủy; không phải giá trị có thể thu hồi. Snapshot từng chi nhánh nhất quán, toàn bộ danh sách không phải một ảnh chụp cùng thời điểm. Không trả thông tin nhân sự hay danh sách đơn của chi nhánh khác cho Manager/Staff.

## Migration và kiểm thử

Giữ Prisma 8 contract/runtime hiện có. Đã emit `contract.prisma` → `contract.json` / `contract.d.ts`. `prisma migration plan --name inventory_recipes` sinh baseline của hợp đồng cũ và delta kho/công thức: 7 bảng mới, unique/index/FK, tất cả additive; không sửa/xóa bảng User/Business/BusinessMember/Branch. Không reset hoặc áp dụng migration vào Aiven. Khi tích hợp các nhánh, đối chiếu marker và hợp đồng Auth/Sales trước khi apply; không chạy lại baseline lên DB đang có bảng.

Domain/API tests: chuyển đổi đơn vị, nhập/xuất/hao hụt/điều chỉnh, sổ phát sinh, bình quân giá, trừ kho công thức/tùy chọn, rollback, idempotency, tranh chấp mô phỏng, hạn dùng, cảnh báo, quyền và cách ly chi nhánh. UI tests: bốn trang tiếng Việt, dữ liệu server, validation, pending, lỗi/thử lại, rỗng, thao tác lưu và key retry. Dùng transactional in-memory store để kiểm thử nghiệp vụ; **chưa kiểm chứng khóa và rollback trên PostgreSQL thật** do không có PostgreSQL thử nghiệm tách biệt. Không dùng Aiven để chạy fixture.

Trước khi đưa vào môi trường thật: nối Auth/CSRF và Order, apply migration lên DB thử nghiệm, chạy kiểm thử cạnh tranh với Prisma adapter. Repository hiện đọc toàn bộ dữ liệu chi nhánh rồi lưu phần đổi; đủ cho nền tảng MVP nhưng cần phân trang và truy vấn tập trung trước khi sổ giao dịch lớn. Unique/FK hỗ trợ tính toàn vẹn; ràng buộc business/branch đầy đủ hiện được bảo vệ trong service, không thay thế quyền DB khi truy cập SQL trực tiếp.
