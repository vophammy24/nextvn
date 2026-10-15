# NextVN Phase B — design system foundation

Date: 2026-10-14 (Asia/Saigon). Branch: `develop`.

## Delivered

The shared design foundation now uses one blue/navy/white palette with selective yellow accents, one font stack and type scale, semantic state colors, spacing, radii, shadows, focus, control dimensions and shared chart colors. Existing CSS remains plain CSS. `index.css` imports [tokens](../../client/src/styles/tokens.css) and [shared primitives](../../client/src/styles/foundation.css). Owner and public legacy color names are compatibility aliases to the same tokens. No backend, database, Prisma, API client, auth, permission, calculation, inventory, subscription, or demo-data source was changed.

### Components added or modified

- Added `BrandLogo` as a reusable NextVN text lockup with a small yellow accent. Added a matching interim wordmark favicon; set document `lang="vi"` and a descriptive NextVN title. Login/Register, the authenticated shell, public header, preview and footer now display NextVN consistently. The PDF's old-name raster and authentic N artwork were preserved, not copied into a mismatched new logo.
- Added native `Button`, `Input`, `Select`, `FormField`, `Badge`, and `Modal` components. Button supports variants, sizes, loading/disabled, native attributes and ref; Input/Select link labels, hints and errors. Existing Foundation PageHeader, SectionCard, StatCard, LoadingState, EmptyState, ErrorState, SearchInput, FilterTabs and StatusBadge were retained and restyled. `DataTable` retains its API and uses new `TableScroll`.
- Replaced only the two Staff inline dialogs with the common native dialog. Existing bill/status and order-detail content and callbacks remain. Reused TableScroll for Orders and Shift history. Replaced product/table div buttons with native buttons. Login/Register demonstrate shared fields/buttons without changing their submit logic, constraints, Google availability or redirects.
- Shared chart series use semantic CSS color variables. Data rows, calculations, axes and tooltips are unchanged.

### Tokens

Primary `#0754D8`, primary hover `#0640A8`, navy `#09265B`, accent `#FFC928`, canvas `#F4F8FF`, surface white, primary text `#172B4D`, secondary text `#475569`. Success/warning/danger have distinct action/indicator, readable text and soft surface tokens. Inter plus system/Segoe UI is the Vietnamese-capable stack. Type sizes span 12–32px; spacing uses 4–48px steps. Focus ring is 3px with 3px offset. Normal controls target 44px; large controls 48px. Existing CSS breakpoint values remain and are documented as reference variables because CSS variables cannot be read in media conditions.

Calculated WCAG contrast ratios for 12 core token pairs were at least **4.83:1**. See [contrast measurements](phase-b/contrast.json). This validates only those token pairs, not every hardcoded color remaining in old page styles or every rendered state.

### Accessibility and responsive foundation

- POS search, Orders filters and the new-member role select have accessible names. Product/table selection now responds to native Space and Enter. POS category, order type and payment choices expose `aria-pressed`.
- Modal has an accessible title, native top-layer behavior, contained Tab navigation, Escape/backdrop/close handling, focus restoration, viewport-bounded width and scrolling for long content. At a 360px viewport the two dialogs measure **328px**, down from 400px in Phase A. Quantity controls measure 44×44px.
- Login/Register fields preserve browser validation and are associated with labels/help text. Orders and Shift tables have named, keyboard-focusable scroll regions. Shared focus and reduced-motion rules apply across scopes. Semantic status text accompanies colors.

### Validation

| Check                         | Result                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck -w client` | Passed                                                                                                                                                                                                                                                                                                                                                           |
| `npm test -w client`          | Passed: 12 files, 67 tests, including new dialog lifecycle, form association and POS checkout-payload regression tests                                                                                                                                                                                                                                           |
| `npm run build -w client`     | Passed; existing >500kB chunk warning remains (about 972.89kB uncompressed / 285.27kB gzip)                                                                                                                                                                                                                                                                      |
| `npm run lint -w client`      | Passed                                                                                                                                                                                                                                                                                                                                                           |
| Browser fixture sweep         | 20 routes × 6 widths = 120 checks, 42 screenshots, no document overflow, page errors or unmapped fixture calls. Mobile menu open/close passes for all 17 authenticated routes. POS keyboard activation and 44px quantity controls pass. Orders/Tables dialog containment, Escape, close button, backdrop and focus return pass. [Results](phase-b/results.json). |
| `npm run check`               | Stops at existing formatting failures; see below. It does not reach its downstream validation steps.                                                                                                                                                                                                                                                             |

The browser harness uses isolated synthetic responses, blocks external requests and rejects non-GET API calls. Its results do not establish live server behavior, production role access, transaction success, accessibility conformance or appearance of every data/error state. Screenshots are [here](phase-b/). Font requests were blocked; screenshots show system fallback, while Inter remains the first font in the CSS stack.

### Existing issues and risks

- Root `npm run check` is blocked by formatting in `client/src/tests/register.test.tsx`, the pre-existing untracked `server/scripts/check-db-connection.ts`, and `wrangler.jsonc`. Investigation showed the first file needs source formatting, while the latter two also contain CRLF. These unrelated backend/config files and the existing test were left unchanged. All Phase B files pass Prettier separately.
- The authentic N with yellow detail is inside the PDF but appears alongside the obsolete **NEZT VEAEN** text in a raster image. A clean official vector or separately approved mark is still needed. The interim text lockup and favicon intentionally do not claim to be that mark.
- Phase A findings beyond the foundation remain: Owner sidebar repeats icons, some Manager/Owner helper text is small, many page-specific colors/inline dimensions remain, Owner form flows and Staff async error states need work, and POS checkout falls below the first mobile screen. The active role screens have not been redesigned in this phase.
- Native `<dialog>` depends on modern browser support. It passed Microsoft Edge checks; older embedded WebViews need separate compatibility testing if supported by the product. Dialog bill-fetch stale-state behavior predates this phase and was not altered. Global token changes can shift visual emphasis on untested content lengths and color pairings.

### Files changed

- Tokens/presentation: `client/src/styles/{tokens,foundation}.css`, `client/src/index.css`, `client/src/features/inventory/integration.css`, `client/src/features/manager/{manager.css,Charts.tsx}`, `client/src/pages/owner/OwnerWorkspace.css`, `client/src/pages/public/landing.css`, `client/src/components/common/AnalyticsChart.tsx`.
- Components: `client/src/components/common/{BrandLogo,Button,Input,Select,FormField,Badge,Modal,Foundation,DataTable}.tsx`.
- Branding/public/auth: `client/public/nextvn-wordmark.svg`, `client/index.html`, `client/src/features/auth/{AuthCard.tsx,auth.css}`, `client/src/pages/auth/{LoginPage,RegisterPage}.tsx`, `client/src/pages/public/LandingPage.tsx`.
- Shared usage: `client/src/layouts/StaffLayout.tsx`, `client/src/pages/staff/{POSPage,TablesPage,OrderHistoryPage,ShiftSummaryPage}.tsx`, `client/src/pages/owner/OwnerWorkspace.tsx`.
- Tests/evidence/docs: `client/src/tests/{foundation,pos-foundation}.test.tsx`, `docs/design/{design-system,ui-improvement-report}.md`, `docs/design/audit-browser.cjs`, `docs/design/phase-b-report.md`, `docs/design/phase-b/{results,contrast}.json` and 42 screenshots.

The untracked Phase A audit/PDF artifacts and `server/scripts/check-db-connection.ts` were present at the start of Phase B and remain untouched. No commit or push was made.

### Phase C recommendations

1. Refactor the **live** StaffLayout menu against an explicit list of existing destinations, giving each a distinct Lucide icon without exposing metadata-only routes. Keep the current role display behavior and redirects.
2. Add a consistent authenticated header for verified business/branch context and account access, with accessible mobile navigation behavior. Preserve current workspace selection and permission boundaries.
3. Review navigation in the real application for Staff, Manager and Owner, then advance to role-page redesign as a separate phase.
