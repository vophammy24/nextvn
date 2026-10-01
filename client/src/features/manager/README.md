# Manager UI

The seven manager pages are lazy-loaded through `ManagerPage`. POS, Tables,
Orders, Profile and the application shell are reused without new role-specific
copies. Route guards continue to derive permissions from `/api/auth/me` membership.

`ManagerDataBoundary` is the data adapter boundary. There are no current manager
backend endpoints. Production shows an unavailable state, not fixture metrics.
The explicit development preview imports `dev/fixtures.ts` dynamically and checks
the business and branch IDs. Fixtures use a fixed reference time of 20/10/2026 11:00 Vietnam time.
Report periods filter daily data; hourly and best-seller sections are explicitly
labelled as today's data. Gross profit is revenue less ingredient cost only.

Inventory status prioritizes out-of-stock, near-expiry, then low stock. Expired
stock is included in the near-expiry attention bucket until a distinct expired
status is added. Quantities and costs use each ingredient's declared base unit.
Recipe cost is estimated and does not execute automatic stock deduction.

Forms validate input but report backend unavailability without changing inventory,
recipes, alerts or accounts. CSV exports are real downloads of labelled demo data;
spreadsheet formula prefixes are neutralized. Manager staff forms accept STAFF or
MANAGER only, reject OWNER in the schema, and prevent editing/disabling OWNER and
the acting manager's own account. These checks must also be enforced server-side
when real mutation APIs are introduced; no backend or database changes are made.
