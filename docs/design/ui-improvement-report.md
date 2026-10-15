# NextVN UI improvement report — Phase A complete

Phase B is recorded separately in [phase-b-report.md](phase-b-report.md). This document remains the Phase A baseline and should be read as historical findings.

Date: 2026-10-14 (Asia/Saigon). Branch: `develop`.

## Outcome and phase boundary

Completed the mandatory initial audit and captured a reproducible baseline. **The UI redesign has not been implemented.** The request explicitly permits finishing and reporting safe phases separately. This pass stops at Phase A because the actual implementation combines three themes, one shared shell, a large Owner workspace and inline operational forms/dialogs. Applying isolated palette fixes would leave the product inconsistent and obscure the baseline needed for the later refactors.

No application source, backend, database, demo dataset, API, authentication, routing, membership, inventory, recipe, payment or calculation behavior changed. No commits or pushes. No database scripts were run. No live checkout, inventory transaction, registration or account mutation was performed.

## Architecture and page count

React/TypeScript/Vite, plain CSS, React Router, TanStack Query, Zustand, Axios/Zod, Lucide and Recharts. All authenticated pages currently use StaffLayout; Manager inventory reuses Foundation through a CSS bridge; eight Owner views live in OwnerWorkspace with a separate green/serif theme. Many named component/page/layout files are empty placeholders.

**20 unique pages audited** (shared pages counted once):

- Public (3): `/`, `/login`, `/register`.
- Staff/shared sales (4): `/app/pos`, `/app/tables`, `/app/orders`, `/app/shift`.
- Manager (4 additional, 8 including shared sales): `/app/inventory`, `/app/stock-transactions`, `/app/recipes`, `/app/alerts`.
- Owner (9): `/app/owner`, `/app/owner/branches`, `/app/owner/revenue`, `/app/owner/menu-profit`, `/app/owner/promotions`, `/app/owner/users`, `/app/owner/settings`, `/app/owner/subscription`, `/app/owner/inventory`.
- Admin (0): empty source placeholders, no implemented routes.

Also inspected `/app` layout entry, the two Owner aliases and wildcard fallback. Dashboard/reports/staff/profile metadata destinations are not registered routes and must not be added to navigation automatically. [Complete page inventory, per-page risks and proposals](ui-audit.md).

## Findings and proposed improvements

The largest consistency issue is the split between purple Sales/Manager, green Owner and purple/lavender public branding. Owner inventory does not share other Owner pages' theme. Existing Foundation components should be retained and their presentation consolidated.

The most concrete responsive defect is the Orders/Tables dialog: both measure **400px wide at a 360px viewport**, clipping outside the viewport. Closed-page document overflow checks alone miss this defect. Dialogs also lack dialog roles and focus management. POS search, Orders filters and the new-member role select need labels; product/table div buttons lack Space activation. Orders/Shift tables miss the existing direct-child overflow rule. Owner sidebar repeats the same icon for unrelated pages.

The PDF has the authentic N/yellow mark, but its raster lockup contains the old name. No new official logo was invented. Active source contains lowercase `nextvn` variants, while `index.html` still has title `client`, `lang=en` and a template favicon. Exact PDF colors are unverified.

The [design-system specification](design-system.md) records proposed semantic blue/navy/yellow tokens, one font and spacing scale, appropriate status foregrounds, reuse contracts, icon mapping, responsive rules and keyboard behavior. **Tokens, components, icons, logos, responsive rules and accessibility fixes are specified only; none have been applied in this phase.**

## Browser baseline

Ran headless Microsoft Edge through the existing local Playwright installation. The [audit harness](audit-browser.cjs) intercepts synthetic API responses and blocks external requests; non-GET API requests are rejected. No secrets or production data are included in artifacts. External fonts were blocked, so screenshots show system fallback fonts rather than proving the downloaded Inter appearance.

| Check                          | Result                                                       | Limit                                                                           |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 20 pages × 6 widths            | 120 captures/measurements completed                          | Widths 1920, 1366, 1024, 768, 390, 360; one fixture state per page              |
| Document horizontal overflow   | None in 120 closed-dialog measurements                       | Does not establish that clipped descendants or local tables are usable          |
| JavaScript page errors         | 0                                                            | Captures `pageerror`, not every browser console warning                         |
| Unmapped intercepted API paths | 0                                                            | Fixture coverage only, not server schema validation                             |
| Rendered alert messages        | None in baseline happy/empty states                          | Failure/loading scenarios were source-audited, not exhaustively browser-tested  |
| Mobile authenticated menu      | Open and close-on-link passed for all 17 authenticated pages | Tested at 360px; no screen-reader certification                                 |
| Tables dialog at 360px         | 400px wide, no dialog role                                   | Confirmed defect; baseline screenshot retained                                  |
| Orders dialog at 360px         | 400px wide, no dialog role                                   | Confirmed defect; baseline screenshot retained                                  |
| Form accessible-name scan      | Found POS search, two Orders selects, new-member role select | Simple DOM scan, includes hidden form controls; not a full accessibility engine |

Saved 42 screenshots: 20 pages at 1366/390 plus two dialogs at 360. [Machine-readable results](baseline/results.json) include every route/width and menu result. Representative images inspected visually:

- [POS mobile](baseline/staff--app-pos-390.png): checkout falls below the first screen even with an empty cart.
- [Manager recipes desktop](baseline/manager--app-recipes-1366.png): useful list/detail composition, but small supporting typography and mixed green/purple accents.
- [Owner overview desktop](baseline/owner--app-owner-1366.png): serif title and green metrics beside purple navigation; repeated sidebar icons.
- [Orders dialog mobile](baseline/dialog-orders-360.png): clipped 400px dialog on 360px screen.

To reproduce from the repository root, start `npm run dev -w client -- --host 127.0.0.1`, then run `node docs/design/audit-browser.cjs`. The script expects the existing `D:\NextVN\ui-audit-tools\node_modules\playwright` installation by relative path; elsewhere set `NEXTVN_PLAYWRIGHT_PATH` to an installed Playwright package. Requires installed Edge. The harness overwrites only its baseline artifacts. No new dependency was installed in the project.

## Validation

| Command                       | Result                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck -w client` | Passed                                                                                                                                                                                |
| `npm test -w client`          | Passed: 10 test files, 62 tests                                                                                                                                                       |
| `npm run build -w client`     | Passed; existing warning about JS chunk >500 kB (approximately 970.45 kB uncompressed / 284.14 kB gzip)                                                                               |
| `npm run lint -w client`      | Passed                                                                                                                                                                                |
| `npm run check`               | Failed at pre-existing formatting problems in `client/src/tests/register.test.tsx`, `server/scripts/check-db-connection.ts`, and `wrangler.jsonc`; subsequent root checks did not run |

Existing tests cover public route behavior, local login redirects, registration, cart calculations and inventory/recipe/UI integrations with mocks. They were neither removed nor modified. Live auth, production-role workflows, checkout and stock mutations remain unverified in this pass. The browser matrix does not replace regression tests or staging verification.

## Files and Git status

New project artifacts:

- `docs/design/ui-audit.md`
- `docs/design/design-system.md`
- `docs/design/ui-improvement-report.md`
- `docs/design/audit-browser.cjs`
- `docs/design/baseline/results.json`
- `docs/design/baseline/*.png` (42 files)

Local audit helpers were also created under `D:\NextVN\ui-audit-tools`: `nextvn-baseline.cjs`, `inspect-brand.cjs`, `brand-object-29.png`, `brand-object-411.png`. They are outside this Git repository; the reusable browser script is included in docs above. Existing audit helpers/results were not overwritten.

Initial Git status: `?? docs/design/` (existing reference PDF) and `?? server/scripts/check-db-connection.ts`. Final status retains these two untracked directory/file entries; the new audit artifacts are inside `docs/design/`. No tracked file diff. Existing PDF and database diagnostic script were preserved. No commit, push or branch switch.

## Remaining risks and priorities

1. **Highest impact — foundation and dialogs:** apply the semantic palette/type/spacing consistently to all scopes; fix modal sizing and keyboard/focus behavior, then verify both operational dialogs and POS controls.
2. **High — navigation and branding:** reuse dedicated icons for existing destinations, standardize NextVN branding/title/language, show current business/branch context. Do not expose unimplemented routes or alter login redirects.
3. **High — operational screens:** improve POS touch targets/checkout reachability, table overflow and states, inventory/recipe form readability and associated validation. Add meaningful interaction/payload regression tests before changing component boundaries.
4. **Medium — Owner/public consistency:** finish Owner form/table/card states and public/auth presentation. Preserve read-only inventory, estimated profit caveats, payment availability and disabled Google behavior.
5. **Medium — full acceptance:** populate charts and long tables, test long Vietnamese names, expanded forms, async failures and long carts at all widths; keyboard/screen-reader/zoom/contrast review; use authorized staging for live operational verification.
6. **Lower — maintenance:** remove proven-unused CSS after migration and consider route code splitting. Treat business selection, payment wiring and missing dashboards as separate functionality proposals.

No implementation regressions were introduced because runtime source is unchanged. Existing defects remain. The full redesign acceptance criteria are **not yet met**; Phases B–G remain outstanding.
