# NextVN Phase E — public screens and final review

Date: 2026-10-14 (Asia/Saigon). Branch: `develop`.

## Completed scope

The existing landing page, login page, and registration page now retain one NextVN identity with the Phase B BrandLogo, blue/white/yellow tokens, Vietnamese-compatible typography, and shared form controls. The landing page already contained the requested product story, workflow, feature highlights, navigation, footer, and public routes; Phase E retained that structure and changed the main CTA from “Dùng thử NextVN” to “Đăng ký NextVN” because `/register` creates an account and no trial flow is implemented.

Login and registration share a new `PasswordField` presentation component with a labeled 44px show/hide control. Toggling visibility keeps the same input value and `name`, so the existing login and registration payloads, validation attributes, error messages, loading state, Google-disabled state, and role redirects remain unchanged. The shared auth card, logo, `Input`, `Button`, `FormField`, error state, and tokens remain in use. The new component is scoped to the auth feature rather than creating another general form architecture.

## Validation and screenshots

Client typecheck, lint, and production build passed. The default client test command passed **17 files / 76 tests** after an existing Owner inventory asynchronous fixture wait was extended from 1 to 5 seconds; the assertion is unchanged. The same 76 tests also passed with two workers. The build emits a large-chunk warning at **979.52 kB JavaScript / 287.10 kB gzip**. `git diff --check` passed.

The isolated Edge fixture checked `/`, `/login`, and `/register` at 1920, 1366, 1024, 768, 390, and 360px: **18 captures, zero document overflow, uncaught page errors, unmapped fixture calls, or unlabeled form controls**. At 360px it verified the landing mobile menu closes with Escape, the business-login CTA reaches `/login`, the registration CTA reaches `/register`, and both password controls reveal and hide without changing their values. [Results](phase-e/results.json); captures: [landing mobile](phase-e/public---390.png), [login mobile](phase-e/public--login-390.png), [registration mobile](phase-e/public--register-390.png), and matching 1366px screenshots in the same directory. Visual review found the three mobile layouts legible and within the viewport.

`npm run check` remains blocked at its first formatting stage by three pre-existing files: `client/src/tests/register.test.tsx`, `server/scripts/check-db-connection.ts`, and `wrangler.jsonc`. Those unrelated files were not reformatted. All Phase C–E authored files checked separately with Prettier. The browser harness uses synthetic data and blocks external requests/mutations; live authentication and registration require staging verification with authorized accounts.

## Phase E files

- `client/src/features/auth/PasswordField.tsx` and `auth.css` — password visibility control and its token-based presentation.
- `client/src/pages/auth/LoginPage.tsx` and `RegisterPage.tsx` — reuse the password control without changing request handling.
- `client/src/pages/public/LandingPage.tsx` — accurate registration CTA copy.
- `client/src/tests/public-presentation.test.tsx` — password-value preservation and CTA route assertions.
- `client/src/tests/owner-inventory.test.tsx` — fixture wait adjustment for default parallel test runs.
- `docs/design/audit-browser.cjs`, `docs/design/phase-e/`, and this report — public browser interactions and evidence.

## Consolidated before/after

| Category   | Phase A finding                                  | Validated result after Phase E                                                                                                                       |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branding   | NextVN and obsolete logo/name variants           | NextVN BrandLogo across public and authenticated screens; clean official vector remains unavailable.                                                 |
| Colors     | Purple Sales, green Owner, lavender public       | Blue/navy/white shared tokens with restrained yellow and semantic status colors.                                                                     |
| Typography | Mixed scales and Owner serif headings            | Shared Inter/system stack and tokenized scale; external font loading was blocked in screenshot runs.                                                 |
| Navigation | Role-specific inconsistencies and repeated icons | One role-driven shell for 17 authenticated routes, semantic icons, active states, keyboard profile and mobile drawer.                                |
| Forms      | Inconsistent labels and controls                 | Shared fields/buttons, visible labels, focus styles, auth password visibility, and no unlabeled public controls in the browser scan.                 |
| Mobile     | 400px dialogs clipped a 360px viewport           | Shared dialogs fit and trap focus; 20 routes × 6 widths passed browser document-overflow checks in Phase C, 17 × 6 in Phase D, and 3 × 6 in Phase E. |
| Feedback   | Mixed alerts and sparse error/empty states       | Shared states and clearer Staff, Manager, Owner, and auth feedback; fixture states do not cover every server error.                                  |

## Remaining problems and regression risks

Owner branch-context switching is not implemented in the existing live UI, so it was not invented or tested. The existing subscription payment control has no completion handler; no payment success is implied. Large production bundle size remains. The responsive harness samples one data state per route, current Edge, and blocked external fonts; test long data, older WebViews, live checkout, stock mutations, and authorized account flows in staging. No backend, database, auth protocol, deployment configuration, commit, or push was changed.
