# Owner UI

Nine owner-only routes are lazy-loaded through `OwnerPage`. The existing shell,
profile, KPI cards, tables, status badges and chart cards are reused. The shared
`AnalyticsChart` adds labelled bar/line charts with an accessible data table.
No owner-specific profile or operational inventory screen is created.

There are no owner business APIs yet. `OwnerDataBoundary` imports typed fixtures
only for the explicit development preview, verifies the business ID, and keys
queries by business. Real sessions show an unavailable state; fixture metrics,
prices and invoices are not substituted for backend data. `/app/profile` always
reads the authenticated user from `/api/auth/me`.

Fixtures cover all three sample branches from July through September 2026.
Week means the last seven days ending September 30; month and quarter mean the
current calendar month/quarter up to that fixed reference date. All sales totals,
category totals, branch totals and menu profits derive from the same rows. Each
fixture sale represents separate single-item orders, so counts are additive.
Gross profit excludes operating costs; average margin is weighted by revenue.
Stock is a point-in-time branch breakdown; ingredient counts are deduplicated,
while attention counts count ingredient/branch pairs. Consumption is monthly.

Recommendations use disclosed deterministic rules or illustrative scenarios,
never an AI or forecast claim. Promotions, branch/user edits, subscription changes
and settings validate or explain backend unavailability without mutating records
or calling payment APIs. Sample plans/prices live only in `dev/fixtures.ts`.

User forms support STAFF, MANAGER and OWNER, with branch assignment required for
staff/managers. Platform ADMIN is excluded. UI guards protect the acting user and
the last active owner. Future backend APIs must enforce tenant/branch membership,
authorization, last-owner invariants and validation independently of these UI
guards. No backend or database changes are included in this phase.
