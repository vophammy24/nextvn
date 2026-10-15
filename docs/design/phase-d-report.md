# NextVN Phase D — role-specific screens

Date: 2026-10-14 (Asia/Saigon). Branch: `develop`.

## Completed scope

All 17 live authenticated routes now use the Phase B tokens and components within the Phase C shared shell. The work changes presentation and safe local interactions; API paths, mutation payloads, cart math, shift rules, inventory consumption, role guards, and financial calculations remain in their existing implementations.

| Role    | Screens improved                                                                               | Main changes                                                                                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff   | POS, Tables, Orders, Shift                                                                     | More readable product cards and cart, mobile cart jump, inline checkout feedback, accessible table selection, bill retry states, bounded order pagination, shift-end confirmation. |
| Manager | Inventory, Stock Transactions, Recipes, Alerts                                                 | Unified token-based inventory surfaces and controls, clearer forms and data density, separate alert severity from workflow status, semantic success/error notices.                 |
| Owner   | Overview, Branches, Revenue, Menu Profit, Promotions, Users, Settings, Subscription, Inventory | Shared hierarchy and blue palette, readable KPI/data surfaces and charts, accessible creation disclosures, explicit empty states, mobile tables and forms.                         |

The existing `Button`, `Input`, `Badge`, `Modal`, Foundation states, shared shell, and design tokens are reused. `OwnerWorkspace` continues to own its existing view data and mutations; no parallel component library or Owner theme was introduced. Phase D also adds focused presentation tests for Manager alerts, Owner branch disclosure, and shift confirmation.

## Accessibility and responsive results

Staff table cards expose dialog semantics and selected area buttons expose pressed state. Bill and order-detail failures now offer retry, and status messages use appropriate live-region roles. The shift-end action requires an accessible confirmation dialog before its existing mutation runs. Owner create forms have visible labels; disclosure buttons expose expansion state and move focus to the opened form. Long tables have named keyboard-scroll regions. CSS uses the shared focus, contrast, spacing, and status tokens.

The isolated Edge harness checked **102 route/viewport pairs**: Staff 4×6, Manager 4×6, and Owner 9×6 at 1920, 1366, 1024, 768, 390, and 360px. It found **zero** document overflow, uncaught page errors, or unmapped fixture requests. Role-specific mobile interactions passed. Results and screenshots: [Staff](phase-d/staff/results.json), [Manager](phase-d/manager/results.json), [Owner](phase-d/owner/results.json). Representative captures: [POS mobile](phase-d/staff/staff--app-pos-390.png), [Inventory desktop](phase-d/manager/manager--app-inventory-1366.png), [Owner overview mobile](phase-d/owner/owner--app-owner-390.png), [Owner settings mobile](phase-d/owner/owner--app-owner-settings-390.png).

Browser fixtures intercept synthetic GET requests and block mutations and external traffic. They validate rendering and interaction affordances, not live checkout, stock adjustment, account creation, or payment. Existing component/integration tests continue to check order and inventory behavior with mocks. No supported Owner branch-context switcher exists in the live UI, so that requested workflow cannot be exercised without inventing functionality. The workspace header correctly displays the verified context it receives.

## Gate validation

Client typecheck, lint, and production build passed after each major role group. After Owner, the controlled-worker client suite passed **16 files / 74 tests**, including role navigation, POS checkout payload, inventory integration, Manager alert payload/status, Owner disclosure, and shift mutation timing. The production build retains the existing large-chunk warning (approximately 978.60 kB JavaScript / 286.87 kB gzip). The default parallel test runner had intermittent 1-second asynchronous fixture timeouts in earlier Phase C runs; `--maxWorkers=2` passed consistently, and assertions were not weakened.

## Files changed in Phase D

- Staff: `client/src/pages/staff/POSPage.tsx`, `TablesPage.tsx`, `OrderHistoryPage.tsx`, `ShiftSummaryPage.tsx`, and scoped rules in `client/src/index.css`.
- Manager: `client/src/features/manager/AlertsPage.tsx`, `TransactionsPage.tsx`, `manager.css`, and `client/src/features/inventory/integration.css`.
- Owner: `client/src/pages/owner/OwnerWorkspace.tsx` and `OwnerWorkspace.css`; the Owner inventory view benefits from the shared inventory CSS bridge.
- Tests: `client/src/tests/shift-confirmation.test.tsx`, `manager-presentation.test.tsx`, and `owner-presentation.test.tsx`.
- Audit artifacts: `docs/design/audit-browser.cjs` and `docs/design/phase-d/{staff,manager,owner}/`.

## Remaining problems and regression risks

The responsive matrix uses one synthetic data state per route and does not prove large-data tables, all validation errors, or older embedded WebViews. Live state-changing workflows need staging verification with authorized accounts. The existing subscription payment button has no completion handler; Phase D does not imply successful payment. Large bundle size and the separate root formatting failures remain. An official clean logo vector is still unavailable; the Phase B interim NextVN lockup is retained. Phase E can proceed because the role pages build, relevant tests pass, and existing critical workflows remain covered by tests and fixture navigation.
