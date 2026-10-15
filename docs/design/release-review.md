# NextVN working-tree release review

Date: 2026-10-15 (Asia/Saigon). Branch: `develop`. Scope: UI/UX Phases A–G and the release-preparation changes in this review. No push or deployment was performed.

## Validation

| Check                   | Result                        | Evidence                                                                                                    |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Client typecheck        | PASS                          | `npm run typecheck -w client`                                                                               |
| Client lint             | PASS                          | `npm run lint -w client`                                                                                    |
| Client tests            | PASS                          | `npm test -w client`: 18 files, 79 tests                                                                    |
| Client production build | PASS                          | `npm run build -w client`: 2,722 modules; JS 980.42 kB / 287.17 kB gzip                                     |
| Root check              | PASS                          | `npm run check`: Prettier, both linters, both typechecks, 79 client tests, 79 server tests, and both builds |
| Server repeatability    | PASS in three additional runs | `npm test -w server` three times: 6 files and 79 tests each run                                             |
| Diff whitespace         | PASS                          | `git diff --check`                                                                                          |

The JavaScript bundle still exceeds Vite's 500 kB warning threshold. Client tests and browser screenshots use mocks or isolated fixtures. No live authentication, POS, inventory, analytics, or cross-branch workflow was tested here.

An intermediate root run failed three client tests when 18 jsdom environments competed for CPU: two exceeded Vitest's 5-second limit and one did not finish loading within Testing Library's 1-second wait. The same 79 tests passed with `--maxWorkers=2`; setting `maxWorkers: 2` in the client Vitest configuration then passed a standalone run and the complete root check. No application assertion or client test timeout was changed. This limits concurrent test load, but does not prove timing will be stable on every CI host.

## Intermittent backend test timeout

`server/tests/demo-seed.test.ts` compares a freshly rebuilt deterministic demo fixture with the original. This test does **not** connect to PostgreSQL or run a seed command. `buildDemo()` constructs 496 orders and 1,256 inventory transactions in memory, including inventory replay and audit hashes. In six consecutive standalone builds, elapsed times were approximately 1.3, 1.3, 3.5, 3.5, 5.8, and 4.2 seconds. Previous full-suite failures took 5.7–7.5 seconds against the test's default 5-second limit. The deterministic equality assertion remains intact; only that test's timeout is now 15 seconds. Three full server runs and the root check passed after this change. Timing can still vary with host load; a future backend performance task should profile inventory replay if this fixture grows.

## Production build and source review

`client/.env.production` sets the public `VITE_API_URL=https://nextvn.onrender.com/api`. Vite loads mode-specific environment files for production builds. `client/vite.config.ts` rejects any production build whose effective `VITE_API_URL` differs, including a shell or CI override. A deliberate localhost override failed before Vite generated assets. The successful production bundle contains the Render API URL and no `localhost:5000/api` or other localhost `/api` URL. Dependencies contain a few generic `http://localhost` URL fallbacks unrelated to the API client. `wrangler.jsonc` serves `./client/dist` as a single-page application; its only pending change is formatting.

The changed-file review found no tracked backend application, Prisma schema, migration, API-client, authentication, calculation, or database-contract change. The only server file proposed for a commit is the demo fixture **test**. A text-file credential-pattern scan found no private keys, common token formats, or assigned database/JWT/Cloudflare secrets. Browser result JSON contains the word `password` only as a control name. The ignored local environment files and `client/dist`/`server/dist` are not proposed for any commit.

## Commit groups

1. `feat(ui): unify NextVN design system and role screens` — `client/index.html`, `client/public/nextvn-wordmark.svg`, `client/src/app/shellNavigation.ts`, `client/src/components/common/*` changes, `client/src/features/auth/*` changes, `client/src/features/inventory/integration.css`, `client/src/features/manager/*` changes, `client/src/index.css`, `client/src/styles/*`, `client/src/layouts/StaffLayout.tsx`, and changed files under `client/src/pages/{auth,owner,public,staff}/`.
2. `test(ui): cover redesigned workflows and stabilize demo fixture` — changed and new `client/src/tests/*.tsx` files and `server/tests/demo-seed.test.ts`.
3. `fix(build): pin the production API URL` — `.gitignore`, `client/.env.production`, `client/vite.config.ts`, and format-only `wrangler.jsonc`.
4. `docs(design): record phase audits and release gate` — `docs/design/**/*.md`, `docs/design/audit-browser.cjs`, and `docs/design/{baseline,phase-b,phase-c,phase-d,phase-e,phase-f,phase-g}/` JSON and screenshot evidence.
5. `test(ui): limit concurrent jsdom workers` — the Vitest `maxWorkers` setting in `client/vite.config.ts` after a loaded full-suite run exposed client test timing failures.

The 92 MB `docs/design/nextvn-brand-reference.pdf` is a local reference and is excluded from these commits. The pre-existing untracked `server/scripts/check-db-connection.ts` is also excluded. Neither file was deleted. Screenshots are audit evidence, not compiled build output; they total about 21.5 MB across all phases.

## Release gate and later deployment

**Production deployment remains blocked** pending the real API and branch-isolation checks in [staging-test-checklist.md](staging-test-checklist.md), plus a deployed-origin smoke test. The configured Render endpoint and Cloudflare account/authentication have not been verified against the live services. Do not run the deployment command until those checks pass and the release owner approves it.

From a clean checkout containing these commits, use PowerShell:

```powershell
cd D:\NextVN\nextvn_ver1.0
npm ci
npm run check
$env:VITE_API_URL = 'https://nextvn.onrender.com/api'
npm run build -w client
rg -q -F 'https://nextvn.onrender.com/api' client/dist/assets -g '*.js'
if ($LASTEXITCODE -ne 0) { throw 'Production API URL missing from client bundle' }
rg -q 'https?://(?:localhost|127\.0\.0\.1)(?::\d+)?/api' client/dist/assets -g '*.js'
if ($LASTEXITCODE -eq 0) { throw 'Localhost API URL found in client bundle' }
npx wrangler deploy --config wrangler.jsonc
```

The final command publishes the static assets to Cloudflare Workers; it was **not** executed in this review.
