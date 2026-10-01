# Authentication UI boundary

The Express app exposes `/api/health`. Authentication is not implemented:
`/api/auth/*` now explicitly responds with HTTP 501 and a safe Vietnamese
unavailable message, while remaining `/api/*` requests are denied with HTTP 401.
These are fail-closed placeholders, not session or RBAC implementations. HTTP
tests verify that client role headers, cookies and arbitrary bearer tokens cannot
grant access. Login/me clients use the existing Axios base URL.

Until a backend session contract exists, even HTTP 2xx is treated as an unverified
session. The UI does not accept tokens, set a user or business membership, or
redirect into `/app`. Google remains disabled because neither OAuth configuration
nor a backend OAuth flow exists. Password recovery sends no request.

Credentials live only in form state and an in-flight request. The form clears its
password after submission. The mutation takes no credential variables, retries
are disabled, and inactive mutations have zero garbage-collection time. Axios
errors are converted to safe errors before entering the mutation cache, because
raw Axios errors can retain credentials in their request configuration. Requests
are aborted on unmount. No tokens or credentials are persisted in browser storage
or Zustand.

Before enabling actual authentication, agree on session verification and typed
responses, HTTPS, cookie or token transport, CSRF defenses, allowed origins,
session expiry/revocation, and business membership resolution with the backend.
Do not infer authentication from HTTP status alone. Never expose raw server errors
or distinguish an unknown email from an incorrect password.
