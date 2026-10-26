# Design guidelines

## Scope

SS Lotus uses the owned shadcn/Radix source in `src/components/ui` for reusable controls and overlays. This is a component foundation, not a visual redesign: the existing light-only SS Lotus system remains the source of truth.

## Tokens

`src/features/application/design-tokens.css` is the single value source for palette, typography, radius, shadows, layers and spacing. `src/features/application/theme.css` imports it, provides the Tailwind v4 bridge, and owns application composition. The root App Router layout imports the bridge; screen and layout composition lives in features.

| Concern | Contract |
| --- | --- |
| Typography | `Mulish, system-ui, sans-serif` for interface and headings. |
| Page surface | `#f6f7f5` background with `#27332e` text. |
| Primary action | `#356b56` with white text. |
| Supporting green | `#173b30` shell and `#edf4ef` soft surfaces. |
| Accent | `#a07138` for Buddhist/ceremony emphasis. |
| Error | `#8c3f39` destructive/error states. |
| Field border | `#d7ddd8`. |
| Surface border | `#e3e9e5`. |
| Radius | 8px compact, 10px controls, 16px panels and sheets. |
| Spacing | Primitive scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Semantic roles: label→field 8px, field/action group 16/8px, panel 24px desktop/16px mobile, section 32/24px, page 40/16px, dialogs 24/16px. |

Do not add a dark mode, replace Mulish with a shadcn preset font, or substitute the palette with default neutral tokens unless the product design is intentionally changed.

Use the semantic token role rather than a new literal where it applies: `--field-label-gap`, `--field-group-gap`, `--action-gap`, `--panel-padding`, `--section-gap`, `--page-padding`, and dialog/footer tokens. Tailwind utilities such as `p-panel`, `p-dialog`, `gap-action`, and `gap-field-group` are bridges to the same values. Do not override Tailwind's global `--spacing`: it would also alter sizing utilities. Keep the existing literal breakpoints (768/780/1000px), PDF/reader dimensions, grid minimums, sidebar widths, and measured dock offsets as feature geometry rather than design-scale tokens.

## Component use

Use the existing primitives when their semantic role fits:

- `Button` for actions, including the SS Lotus `catalog` variant for catalog secondary actions.
- `Input`, `Label`, `Select`, `Checkbox`, and `RadioGroup` for fields and choices.
- `Card`, `Table`, and `Skeleton` for reusable surfaces, tables, and loading states.
- `Dialog`, `AlertDialog`, `Sheet`, and `Popover` for focus-managed overlays.

Feature CSS belongs with the owning composition stylesheet (`theme.css` or a feature-scoped stylesheet imported by it) while the app continues to use a shared stylesheet. It may size or arrange a primitive via its class or `data-slot`; it must not reintroduce generic `button`, `input`, `select`, or `label` rules that override the primitive base styles.

## Cầu An workspace

The approved reference is `plans/households-ui-mockup/`. Search is the landing view; creating a household opens a separate draft view from the secondary Thêm hộ action in the search panel. Results show household code, family addresses/counts and the household head.

Household detail uses compact family cards with member selection, dharma names, birth years and drop zones. One floating dock owns structure operations, save and booking; contextual dialogs collect fields instead of permanently displaying operation forms. Booking remains disabled until the canonical household has been saved. The booking dialog shows a five-column grid of lunar days followed by the selected day's three periods. Keep dialog header/footer fixed and scroll its body. Scoped composition styles live in `src/features/application/household-workspace.css`, imported by `theme.css`.

## Accessibility

Use primitive-provided semantics and keyboard handling rather than rebuilding overlays manually. Provide a visible `Label` or an accessible name for each field and action. Keep lifecycle safeguards when saving: destructive/cancel actions must not close a pending form, and focus should return to the opening action after a sheet or dialog closes.

## Responsive behavior

Preserve the existing 768px shell breakpoint and 780px catalog/workflow breakpoint. Mobile layout changes should reorganize available space without changing routes, data payloads, Lunar date rules, or browser-side Supabase authentication.

## Application navigation

Landing pages start directly with search, metrics, or settings content. Keep the page heading accessible with `sr-only` instead of adding a large introductory hero. Place create/import/management actions beside the relevant content. Detail pages retain the household or document identity and its useful metadata.

The application sidebar is available on all non-login screens. It may collapse to an icon rail on desktop and must retain descriptive accessible names and tooltips for each navigation item. At 768px and below, the sidebar remains a menu drawer with the existing mobile navigation; do not force a collapsed rail onto small screens.

## Library browsing

The admin library opens with published books grouped in category order, a category filter with published counts, and search across title, author, and filename (including Vietnamese queries without accents). Book titles and the Xem action open the existing public reader. Both library lists keep search and category filters together in one sticky surface at the top of the shell's content scroll area. Desktop categories use horizontal wrapping chips; at 780px and below, a compact category select keeps the sticky area short. Detail-reader navigation retains its separate layout.

Công cụ quản lý opens a task chooser instead of scrolling to a management section below the books. It offers single PDF upload, batch upload, category management, and interrupted-upload handling. Uploads open their own sheet/dialog; categories and maintenance use separate views within the management dialog, with a back action. Keep the dialog header/footer fixed and scroll only its body. Block closing or changing the management view while a mutation is pending. Closing tools restores focus to their trigger and preserves the catalog's search/category filters. A badge on the trigger counts pending/cleaning/deleting records. Keep the PDF size/retry guidance beside upload tools. Preserve all existing lifecycle safeguards and permissions.
