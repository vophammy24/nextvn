# Sales Operations — Domain Documentation

> Owner: Member 1 (feature/sales-operations)

## Entities

### Enums

| Enum            | Values                                                          |
| --------------- | --------------------------------------------------------------- |
| `OrderType`     | `DINE_IN`, `TAKEAWAY`                                           |
| `OrderStatus`   | `OPEN`, `CONFIRMED`, `PAID`, `CANCELLED`                        |
| `TableStatus`   | `AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `NEED_PAYMENT` |
| `PaymentMethod` | `CASH`, `BANK_TRANSFER`                                         |
| `ShiftStatus`   | `ACTIVE`, `CLOSED`                                              |

### Models

- **MenuCategory** — branch-scoped menu categories
- **MenuItem** — menu items with server-authoritative prices (int, VND)
- **RestaurantArea** — floor/zone grouping for tables
- **RestaurantTable** — tables with server-validated status transitions
- **Order** — orders with server-calculated totals
- **OrderItem** — snapshot of item name/price at order time
- **OrderPayment** — payment method + amount record
- **Shift** — staff shift tracking with derived summary

## API Routes

Base: `/api/business/:businessId`

### Menu

| Method | Route                        | Description                             |
| ------ | ---------------------------- | --------------------------------------- |
| GET    | `/menu/:branchId/categories` | List active categories                  |
| POST   | `/menu/:branchId/categories` | Create category                         |
| GET    | `/menu/:branchId/items`      | List items (filter: categoryId, search) |
| POST   | `/menu/:branchId/items`      | Create item                             |

### Orders

| Method | Route                               | Description                                        |
| ------ | ----------------------------------- | -------------------------------------------------- |
| POST   | `/orders`                           | Create order + payment (server calculates totals)  |
| GET    | `/orders/:branchId`                 | List orders (filter: status, type, today, shiftId) |
| GET    | `/orders/:branchId/:orderId`        | Get order detail                                   |
| PATCH  | `/orders/:branchId/:orderId/status` | Update status (validated transitions)              |

### Tables

| Method | Route                               | Description                           |
| ------ | ----------------------------------- | ------------------------------------- |
| GET    | `/tables/:branchId/areas`           | List areas                            |
| POST   | `/tables/:branchId/areas`           | Create area                           |
| GET    | `/tables/:branchId`                 | List tables (filter: areaId)          |
| POST   | `/tables/:branchId`                 | Create table                          |
| PATCH  | `/tables/:branchId/:tableId/status` | Update status (validated transitions) |
| GET    | `/tables/:branchId/:tableId/bill`   | Get current table bill                |

### Shifts

| Method | Route                                | Description                                 |
| ------ | ------------------------------------ | ------------------------------------------- |
| POST   | `/shifts/start`                      | Start shift                                 |
| POST   | `/shifts/end`                        | End shift                                   |
| GET    | `/shifts/:branchId/active`           | Get active shift                            |
| GET    | `/shifts/:branchId`                  | List shifts (Staff: own only, Manager: all) |
| GET    | `/shifts/:branchId/:shiftId/summary` | Derived shift summary                       |

## Authorization Rules

1. All routes require JWT authentication (`Bearer` token)
2. Business membership is validated server-side via `resolveMembership` middleware
3. Branch ownership is validated on every request
4. Staff sees only their own shifts; Manager sees all branch shifts
5. Never trust frontend-submitted prices, totals, or role
6. cashierId is extracted from JWT, not request body

## Table State Transitions

```
AVAILABLE → OCCUPIED, RESERVED
OCCUPIED → NEED_PAYMENT, CLEANING
RESERVED → OCCUPIED, AVAILABLE
CLEANING → AVAILABLE
NEED_PAYMENT → CLEANING, AVAILABLE
```

## Order State Transitions

```
OPEN → CONFIRMED, CANCELLED
CONFIRMED → PAID, CANCELLED
PAID → (terminal)
CANCELLED → (terminal)
```

## Payment Rules

- payOS is **NOT** used for POS orders
- POS records merchant-received payments via: `CASH` or `BANK_TRANSFER`
- No E_WALLET payment method
- Bank transfer reconciliation is architecturally supported but not implemented

## Inventory Integration Boundary

When a paid order is confirmed, the system calls:

```typescript
InventoryConsumptionService.consumeOrder(orderId);
```

Currently a **documented no-op stub** in `orders.service.ts`.

The inventory team (Member 2) owns:

- Recipe CRUD
- Ingredient consumption engine
- Stock deduction logic

This boundary is explicit and does NOT fake stock deductions.

## Frontend Pages

| Route         | Page             | Description                       |
| ------------- | ---------------- | --------------------------------- |
| `/app/pos`    | POSPage          | Full POS with menu, cart, payment |
| `/app/tables` | TablesPage       | Table management with areas       |
| `/app/orders` | OrderHistoryPage | Order history with filters        |
| `/app/shift`  | ShiftSummaryPage | Shift start/end + summary         |
