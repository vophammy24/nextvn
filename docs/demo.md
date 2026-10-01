# NextVN classroom demo

Run commands from `D:\NextVN\nextvn_ver1.0` on `develop`. No Google account is needed.

## Setup

1. Run `npm install`.
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env` if those files do not exist. Configure your PostgreSQL connection, its TLS certificate as required by your provider, and strong JWT secrets. Do not overwrite existing credentials. Client API URL: `http://localhost:5000/api`.
3. Set `DEMO_PASSWORD` in `server/.env` (8+ characters, at most 72 UTF-8 bytes). Only outside production, missing/empty values use `NextvnDemo@2026`. Production requires both `ALLOW_DEMO_SEED=true` and an explicit password. No passwords are printed by the seed.
4. Run `npm run db:status`. For the username change run `npm run db:emit`, `npm run db:plan`, inspect the additive nullable column/unique constraint plan, then `npm run db:init` and `npm run db:status`. Never accept an unrelated destructive plan.
5. Run `npm run db:seed`.
6. Run `npm run dev:server` and `npm run dev:client` in separate terminals (or `npm run dev` for both).
7. Open `http://localhost:5173/login`.

| Account           | Role                    | Scope            |
| ----------------- | ----------------------- | ---------------- |
| `owner.demo`      | Owner — Nguyễn Minh Anh | All Mây branches |
| `manager.haichau` | Manager — Trần Quốc Huy | Hải Châu         |
| `manager.sontra`  | Manager — Lê Thanh Vy   | Sơn Trà          |
| `staff.demo`      | Staff — Phạm Gia Bảo    | Hải Châu         |

All accounts use the configured `DEMO_PASSWORD`. Emails are `<username>@nextvn.local`. Local login uses the existing `access_token`, JWT claims and verified `/api/workspace`. Owners land on Owner overview, managers on inventory, and staff on POS. Use **Đăng xuất** before switching accounts. Registration creates a user only; a business membership must be assigned separately.

## Dataset

Mây Coffee & Tea is a coffee/beverage business in Đà Nẵng. Opening reference: **25 August 2026** (`Business.createdAt`). Both branches are active:

- **Mây Coffee Hải Châu**, Hải Châu, Đà Nẵng: central location, busy mornings and afternoons.
- **Mây Coffee Sơn Trà**, Sơn Trà, Đà Nẵng: residential/tourist area, busier afternoons and evenings.

The fixture is fixed to **25 August–1 October 2026**, ending with the morning sales on 1 October. It has 496 orders, 15 menu items and 21 ingredients per branch (30 menu records, 42 ingredients, 30 recipes), five categories per branch, six tables per branch, historical closed shifts, actual payments and inventory audit records. Hải Châu has 286 orders and Sơn Trà 210. Most orders are paid; cancelled orders have no payment or consumption. Bank transfers are approximately 65%. Pastry pairings and weighted beverage popularity create useful sales patterns.

Costs are VND per gram, milliliter, or piece; persisted quantities are thousandths of that base unit. The inventory service generates imports, waste, closing adjustments and idempotent sale consumption. Lot balances reconcile with stock and transaction deltas. Fresh ingredients are replenished daily for historical sales; dry stock every four days. Current stock includes low matcha/peach stock and low Sơn Trà milk/lychee/tiramisu, plus near-expiry pastries and ice. No remaining lot is expired on the fixture date.

Settings use VND, vi-VN, zero added tax/service charge, and the receipt footer shows daily 07:00–22:00 opening hours. The existing analytics uses Asia/Ho_Chi_Minh. The schema does not have business type/status, branch description, timezone, or structured opening-hours fields; this document records those details without adding unsupported fields. Active branches/memberships represent the active demo business.

FREE (0), STANDARD (199,000/month) and PRO (399,000/month) plans are inserted only when their codes are absent. Existing global plans are preserved. The business receives STANDARD with a clearly marked internal demo reference. A PENDING 199,000 VND billing record is an unpaid demonstration invoice, not a successful payOS transaction.

## Repeatability and safety

`npm run db:seed` builds the fixture with a seeded PRNG and stable UUIDs. One database transaction and an advisory lock protect the complete tenant creation. Subsequent runs preserve the existing demo tenant, passwords, live orders and stock; they never replay sales or reset inventory. Conflicting account identities cause an abort rather than overwriting another tenant. A failed first run rolls back. No tables are truncated, no tenants are deleted, and no automatic reset command is provided. Changing `DEMO_PASSWORD` after the first seed does not change stored passwords.

## Seven-minute presentation

1. **0:00–1:00** Login as `owner.demo`. Show business overview, revenue and estimated gross profit.
2. **1:00–2:00** Compare the two branches (branch revenue/order counts use the last 30 days). Show revenue, popular products, category revenue and peak hours.
3. **2:00–3:00** Open Owner inventory overview. Point out low stock and near-expiry lots; explain the purchasing decision.
4. **3:00–4:00** Log out; login as `manager.haichau`. Open recipes, inspect Cà phê sữa (18 g coffee, 28 ml condensed milk, 160 g ice). Note current inventory balances.
5. **4:00–5:00** Open **Ca làm việc**, start a shift, then **POS / Bán hàng**. Add Cà phê sữa + Croissant and select CASH or BANK_TRANSFER.
6. **5:00–6:00** Submit checkout. The existing POS creates and pays the order in one action. Order, lines, payment and recipe-based inventory deduction commit atomically; insufficient usable stock rolls everything back. Inspect order history and the SALE_CONSUMPTION stock transaction. Verify coffee decreased 18 g, condensed milk 28 ml, ice 160 g, croissant one piece.
7. **6:00–7:00** Log out and return as Owner. Refresh revenue/inventory and explain: **Order → Recipe → Inventory deduction → Cost → Analytics → Owner decision**.

## Limits

- Dates are deliberately fixed for reproducibility. Later presentations need a reviewed new fixture/date revision or fresh inventory imports; rerunning the seed does not extend history or refresh expiry dates. Analytics uses the real current date, so rolling charts eventually age out.
- Google auth has no implementation in this checkout. Its secondary login option is disabled with a non-blocking explanation; no Google implementation was removed.
- Access tokens use the configured expiry (15 minutes by default); log in again after expiry. No second token or refresh system was introduced.
- Gross profit uses the current recipe/ingredient-cost estimate, not accounting net profit. Promotions remain the existing rule-based best-seller recommendation; seeded pairings do not imply a new recommendation algorithm.
- A billed subscription does not enable payOS checkout. Demo billing remains unpaid.

## Verified on 1 October 2026

The seed was executed twice against the configured Aiven database. Both verification runs returned the same fingerprint for order totals/statuses, inventory quantities and stock transaction identities/hashes:

`21d4038803ccc7424db703c66c4f27f787db3c655877cf7fc82a02b5687adbd5`

| Verified record           |   Hải Châu |    Sơn Trà |      Total |
| ------------------------- | ---------: | ---------: | ---------: |
| Menu items / recipes      |    15 / 15 |    15 / 15 |    30 / 30 |
| Ingredients               |         21 |         21 |         42 |
| Orders                    |        286 |        210 |        496 |
| Paid orders               |        277 |        205 |        482 |
| Paid revenue (VND)        | 16,520,000 | 11,134,000 | 27,654,000 |
| Inventory transactions    |        668 |        588 |      1,256 |
| Active LOW_STOCK alerts   |          2 |          5 |          7 |
| Active NEAR_EXPIRY alerts |          3 |          3 |          6 |

All four account logins and workspace assignments passed. Owner overview, revenue, menu profit, branches, subscription and inventory summary returned HTTP 200 with persisted data; measured responses were below four seconds. A paid Cà phê sữa checkout deducted 18 g of coffee; replay did not deduct again. That test transaction was rolled back. An insufficient-stock checkout also rolled back without leaving an order or changing stock.

Repeat live verification with `npm exec -w server -- tsx scripts/verify-demo.ts`. It uses configured demo credentials, prints no tokens/passwords, reads the tenant, and rolls back its test checkout. It assumes the original seeded menu/recipe counts; intentional demo edits can change the fingerprint.

Quality gates: **58 client tests**, **79 server tests**, both typechecks, lint, formatting, production build and `npm run check` passed. `npm audit --omit=dev` reported **0 vulnerabilities**. `npm run db:status` reports matching current/target contract hashes. Vite still reports the existing large-bundle warning; the build succeeds. No commit or push was performed.
