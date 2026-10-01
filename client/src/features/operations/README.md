# Shared operational UI

POS, Tables and Orders live here and are mounted once for STAFF and MANAGER.
Profile is shared by all business roles in `features/auth/components/ProfilePage`.
The shift page is STAFF-only. Navigation and direct-route role checks use the
same `app/navigation.ts` configuration.

Production routes are gated on `GET /api/auth/me` (the existing Axios API base URL
already includes `/api`). The proposed response contract is:

```json
{
  "user": { "id": "...", "fullName": "...", "email": "...", "phone": null },
  "membership": {
    "role": "STAFF",
    "business": { "id": "...", "name": "..." },
    "branch": { "id": "...", "name": "..." }
  }
}
```

The backend must derive membership from BusinessMember and enforce tenant, branch,
shift and role scope on every API endpoint. Frontend route guards are not a substitute
for backend authorization. The current backend has only `/api/health`; no auth or
operational endpoints, database changes, or cookie policy were implemented here.
The authenticated profile rejects invalid responses and never substitutes fixtures.
The session adapter uses credentials for a future cookie session: backend CORS,
HTTPS, CSRF and session policy still need implementation before real authentication.

Development preview requires an explicit role selection. It is gated by Vite DEV;
fixtures are dynamically imported only in that path and contain a fixed reference
date of 20/10/2026. No production fixture fallback exists. The old presentation-only
workspace context does not authorize routes. Preview role switches remount the shell
to clear in-memory drafts. No cart persistence or mutation of real orders occurs.

Staff fixtures are filtered by branch, cashier and permitted shift. Manager fixtures
are filtered by branch. Shift revenue and receipts by payment type exclude cancelled
orders. All real operational data paths show an unavailable state until API contracts
exist. Payment, checkout, shift close, report submission, password change and logout
do not claim success or send unsupported mutations. Receipt printing creates an
explicitly watermarked draft only. No payment gateway is integrated.
