# NextVN Phase C — navigation and application shell

Date: 2026-10-14 (Asia/Saigon). Branch: `develop`.

## Completed scope

The existing `StaffLayout` remains the single authenticated shell for Staff, Manager and Owner. Its menu is now driven by `client/src/app/shellNavigation.ts`, an explicit list of **mounted** routes. Staff has four sales destinations; Manager has the same four plus four inventory destinations; Owner has nine destinations grouped into operations and business management. The existing Manager shift link remains visible. No dashboard, reports, staff-management, profile or Admin placeholder route was exposed, and route guards and redirects were not changed.

The sidebar uses the Phase B BrandLogo, shared blue/navy/yellow tokens, 20px semantic Lucide icons, readable labels, scrollable groups, a clear active state and a persistent logout control. The shared header shows the current destination, verified business and branch names when available, and a keyboard-accessible profile disclosure with role and logout. It does not add a business or branch switcher because none exists in the live shell.

At 760px and below the sidebar becomes an overlaid drawer. Opening it locks body scrolling, makes main content inert, moves focus into the menu and contains Tab navigation. Escape and the backdrop close it; a navigation click closes it and returns focus to main content. The profile disclosure closes with Escape or an outside pointer click. Existing token removal, cart clearing, query cancellation/clearing and login redirect are unchanged.

## Files changed

- `client/src/app/shellNavigation.ts` — live role menu configuration.
- `client/src/layouts/StaffLayout.tsx` — shared sidebar, header, drawer and profile controls.
- `client/src/index.css` — shell layout and responsive presentation using Phase B tokens.
- `client/src/tests/shell.test.tsx` — role menu, active route, context, profile, drawer, logout and history checks.
- `client/src/tests/pos-foundation.test.tsx` — extended one asynchronous fixture wait from 1 to 5 seconds after full-suite worker contention caused timeouts; the assertions and checkout payload remain unchanged.

## Validation

| Check                                  | Result                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client typecheck                       | Passed                                                                                                                                                                                                                                                                                                    |
| Client lint                            | Passed                                                                                                                                                                                                                                                                                                    |
| Client production build                | Passed; existing large-chunk warning remains (974.01 kB JS / 285.88 kB gzip)                                                                                                                                                                                                                              |
| `npm test -w client -- --maxWorkers=2` | Passed: 13 files, 71 tests                                                                                                                                                                                                                                                                                |
| `npm test -w client`                   | Two attempts each had a different async fixture exceed Testing Library's default 1-second wait while other workers were active. POS passed in the second run; Owner inventory passed in the first. All tests pass with two workers.                                                                       |
| Isolated browser fixture               | 20 pages × six widths = 120 checks; no document overflow, page errors or unmapped fixture calls. All 17 authenticated mobile menus opened and closed after link activation. POS keyboard and both shared dialogs retained their Phase B checks. [Results](phase-c/results.json), [screenshots](phase-c/). |

Browser checks use intercepted synthetic GET responses and block external calls and mutations. They do not validate live server operations or production role assignments. Existing route tests still verify direct Manager inventory access is blocked for Staff and Owner and that unsupported ADMIN workspace roles fail.

## Remaining issues and regression risks

Several Staff pages still repeat their title in their own top bar below the new shell header; Phase D should consolidate the visual hierarchy without removing status indicators. Business and branch are displayed from the verified workspace, but switching behavior was not added. The fixed drawer and native `inert` property should be checked in any supported legacy WebView; validation used current Microsoft Edge. Long translated names and heavily populated datasets need further review.

The browser images include one fixture state per page and do not establish all loading/error states. A clean official logo vector remains unavailable, so the Phase B interim NextVN lockup is preserved.

Phase C's controlled-worker tests, typecheck and build passed, and existing role links remain intact. Phase D may proceed.
