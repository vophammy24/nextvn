# NextVN design system — implementation specification

Phase A specification, updated after Phase B implementation on 2026-10-14. See [ui-audit.md](ui-audit.md) for route scope and [phase-b-report.md](phase-b-report.md) for the delivered work, checks, and remaining issues.

## Implemented foundation

`client/src/styles/tokens.css` is the source of truth for semantic colors, type sizes and line heights, spacing, radii, shadows, focus, control dimensions, layering, and reference breakpoint values. `index.css` imports it and retains the existing public class names so working pages remain compatible. CSS cannot use `var()` in media-query conditions, so breakpoint variables document the matching existing literal conditions; changing breakpoint behavior belongs to a later phase. `client/src/styles/foundation.css` styles the reusable controls and existing Foundation/DataTable patterns through the same plain-CSS architecture.

The implemented primary is `#0754D8`, navy `#09265B`, accent `#FFC928`, canvas `#F4F8FF`, and surface white. The body is `#172B4D`; secondary text uses `#475569` in implementation rather than the original proposed `#64748B`, improving contrast on the light canvas. `--primary-light` is a lighter focus/decoration blue; white text should use `--primary` or `--primary-dark`. Status text uses separate foreground and soft-surface tokens. The implemented Inter stack retains system and Segoe UI fallbacks for Vietnamese text and offline font loading.

Owner and landing legacy variables now alias shared tokens; Owner body and active headings use the common font. Manager's selected recipe and shortcut states use shared blue surfaces. Shared chart series use token colors. Remaining hardcoded colors and small text in page-specific CSS are known migration work, not a second token source for new components.

The reusable `BrandLogo` is a typographic NextVN lockup with a yellow accent. `client/public/nextvn-wordmark.svg` is an interim favicon. The PDF's original N artwork remains preserved in the reference document; its old-name raster lockup is not used as a product asset. A final vector provided by the brand owner can replace the interim lockup later without recreating the old name.

Shared component contracts:

| Component                                                                                        | Current contract                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                                                                                           | Native button props/ref, primary/secondary/ghost/danger variants, small/default/large sizes, disabled/loading and busy semantics; defaults to `type="button"` to avoid implicit form submission |
| Input, Select, FormField                                                                         | Native props/ref with optional label, hint, error; generated IDs, associated descriptions and invalid state when provided; existing form names and values retained                              |
| Badge, StatusBadge                                                                               | Semantic tone with text label; status text remains in Foundation's existing mapping                                                                                                             |
| Modal                                                                                            | Controlled native `<dialog>` with name, top-layer/inert background, viewport-bounded size, Escape/backdrop/close button, Tab containment and focus return                                       |
| PageHeader, SectionCard, StatCard, SearchInput, FilterTabs, LoadingState, EmptyState, ErrorState | Existing Foundation components, now sharing tokens and presentation; original props retained                                                                                                    |
| DataTable, TableScroll                                                                           | Existing captioned DataTable retained; named keyboard-focusable overflow wrapper also used for the raw Orders and Shift tables                                                                  |
| AnalyticsChart                                                                                   | Existing Recharts component and data disclosure retained; only series colors changed                                                                                                            |

The new controls are demonstrated on Login/Register, and the shared dialog, TableScroll and native product/table buttons are used on Staff pages. This is a foundation rollout, not a redesign of every role screen.

## Approach

Extend global `index.css` tokens and existing Foundation, DataTable, AnalyticsChart and AuthCard. Avoid a second UI framework. Retain Lucide and Inter/system fallback with Vietnamese support. Keep existing primitive prop contracts and query/form behavior. Migrate Owner and landing aliases in the same foundation phase so colors and typography do not remain split by role.

## Semantic colors

These values follow the requested brand direction; they are not certified PDF samples. Separate status foreground from status fill so small text remains readable. Validate all actual foreground/background pairs and focus indicators during implementation.

| Token                          | Proposed value        | Use                                                 |
| ------------------------------ | --------------------- | --------------------------------------------------- |
| `--primary`                    | `#0754D8`             | Main actions, active navigation, links              |
| `--primary-dark`               | `#0640A8`             | Hover/pressed                                       |
| `--primary-bg`                 | `#EAF1FF`             | Selected light surfaces                             |
| `--navy`                       | `#09265B`             | Sidebar, strong headings                            |
| `--accent`                     | `#FFC928`             | Brand details, selected emphasis; navy text         |
| `--bg-secondary`               | `#F4F8FF`             | Application canvas                                  |
| `--bg-primary`                 | `#FFFFFF`             | Forms, cards, dialogs                               |
| `--text-primary`               | `#172B4D`             | Body text                                           |
| `--text-secondary`             | `#64748B`             | Supporting text on white; verify on tinted surfaces |
| `--border-light`               | `#E2E8F0`             | Decorative separators; not sole input affordance    |
| `--border-control`             | `#64748B`             | Control boundary when needed for contrast           |
| `--success` / `--success-text` | `#16A34A` / `#166534` | Healthy/completed fill or indicator / readable text |
| `--warning` / `--warning-text` | `#D97706` / `#92400E` | Caution indicator / text                            |
| `--danger` / `--danger-text`   | `#DC2626` / `#991B1B` | Destructive/error action / text                     |

Define soft status surfaces centrally. Do not put white small text on bright yellow or assume success green is suitable as a white-text button. Status labels/icons carry meaning alongside color. Separate alert severity from OPEN/IN_PROGRESS/RESOLVED workflow state; leave calculations unchanged.

Migration status: Owner `--ink`, `--muted`, `--line`, `--paper`, `--canvas`, `--green*` and landing `--lp-*` aliases now point at shared semantics; inventory bridge inherits shared text colors; chart series use shared palette. Remove legacy variable names only as page-specific styles are changed later.

## Typography and layout

- Font: existing Inter, system-ui, Segoe UI, sans-serif. Remove Owner serif page headings. Retain fallback if remote fonts are unavailable; evaluate local font hosting separately.
- Page titles 28–32px, narrow 24–28px; section headings 20–24px; card headings 16–18px; body 14–16px; table text 13–14px; helpers 12–13px. Headings line-height 1.2–1.3; body 1.5–1.6. Weights 400/500/600/700.
- Use tabular numbers for currency/quantities, right-aligned numeric table cells; retain `vi-VN`/VND helpers and current date semantics. Formatting cleanup must not change amounts or precision rules silently.
- Space scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Page padding 24 desktop/16 mobile; cards 20–24/16; form rows 16; grid gaps 16–24.
- Radii: existing 6/8/12/16px and pill. Use 8px controls, 12px cards, 16px dialogs. Subtle existing shadow-sm/md for surface hierarchy; avoid decorative card gradients.
- Controls: 44px normal/touch baseline; 48px prominent checkout; 16px mobile form text; disabled and pending visibly distinct. Do not hide submitted errors behind disabled controls.
- Shell: preserve 260px desktop sidebar and 64px header baseline; use a shared dimension token. Main min-width 0. Display only existing business/branch context and permitted links.
- Layers: header 40, sidebar 50, overlay/dialog 100, transient feedback 110. Do not add a global notification feature without an existing source.
- Motion: 150/200ms interactive transitions; reduced-motion disables nonessential animation/translation. Focus: visible 3px ring with offset and contrasting inverse variant on dark surfaces.

## Component consolidation

| Existing basis                                | Keep/extend                                              | Required behavior                                                                                     |
| --------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Foundation PageHeader/SectionCard/StatCard    | Reuse; share styles across scopes                        | Semantic heading hierarchy; wrapping actions; number overflow                                         |
| Foundation LoadingState/ErrorState/EmptyState | Adopt at repeated state sites                            | Status/alert announcements, retry only when supported, actionable empty copy                          |
| Foundation SearchInput/FilterTabs             | Reuse                                                    | Real labels, native buttons, aria-pressed, visible focus                                              |
| Foundation StatusBadge                        | Reuse with contextual status agreement                   | Label plus tone; avoid conflicting table-state meanings                                               |
| DataTable                                     | Reuse                                                    | Caption, scoped headers, focusable named scroll region, numeric cells, empty row                      |
| AnalyticsChart                                | Retain Recharts, accessibility layer and data disclosure | Token palette, readable axes/tooltips, empty state, no synthetic production metrics                   |
| AuthCard                                      | Retain                                                   | Shared BrandLogo, labeled fields, pending/error feedback, disabled Google explanation                 |
| Empty Button/Input files                      | Implement only when needed                               | Native HTML attributes/ref support, variants, disabled/loading; associated hint/error IDs             |
| Empty Modal file                              | Implement for both sales dialogs                         | Accessible name, dialog semantics, initial focus, containment, Escape, restore focus, viewport sizing |
| Inline notices/native alert usage             | Consolidate a small alert/notice pattern                 | Correct status vs alert, visible success/error, preserve mutation timing                              |
| Raw Orders pagination                         | Consolidate when fixing it                               | Current-page semantics, bounded controls, existing query behavior                                     |

Do not create unused tooltip, checkbox, date-range, toast, breadcrumb or tab abstractions merely to match a checklist. Native labeled controls and existing FilterTabs are appropriate. If revenue remains a filter group, use that semantics; if true tabs are retained, implement the complete keyboard/panel pattern.

## Branding and navigation

The public-facing name is **NextVN** everywhere, including accessible names, title and footer. Use a shared BrandLogo with light/dark/full/compact presentation only once an authentic symbol extraction or vector is available. The PDF includes an old-name raster lockup; do not display that old text or call a newly drawn mark official. A text-only interim NextVN lockup is an acceptable documented limitation.

Keep the existing icon library. Actual destinations: POS ShoppingCart; tables LayoutGrid/Armchair; orders ClipboardList/ReceiptText; shift Clock; inventory Package/Boxes; transactions ArrowLeftRight; recipes CookingPot; alerts Bell; Owner overview LayoutDashboard; branches Building2/Store; revenue ChartNoAxesCombined; menu profit Utensils; suggestions Sparkles/Lightbulb; members Users; subscription CreditCard; settings Settings; inventory overview Warehouse; logout LogOut. Decorative icons should be hidden from assistive technology when text already labels the action.

The available navigation metadata is not safe to render wholesale: it includes nonexistent routes. Reuse its icon definitions against currently rendered links, without exposing dashboard/reports/staff/profile routes or changing who sees Shift. Preserve Owner aliases and login landing paths.

## Responsive and accessibility verification

Retain current CSS breakpoints initially (documented in audit); consolidate only after measurements. Validate 1920/1366/1024/768/390/360 widths, 200% zoom, long names, populated tables/charts, expanded forms, dialogs and a long cart. Keep horizontal scrolling inside labeled table regions. Dialog width must fit viewport minus 32px with no competing fixed minimum. Mobile nav is currently in-flow disclosure: implement Escape/return-to-trigger appropriately without imposing overlay focus handling unnecessarily.

Preserve labels, visible focus, native button Space/Enter behavior, form help/error association, selected-state semantics and readable statuses. Add confirmations for destructive actions as an explicit UI behavior change with targeted tests, preserving the underlying mutation. Full keyboard/screen-reader and contrast review remains an implementation acceptance task.
