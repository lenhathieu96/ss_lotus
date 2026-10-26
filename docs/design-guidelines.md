# Design guidelines

## Scope

SS Lotus uses the owned shadcn/Radix source in `src/components/ui` for reusable controls and overlays. The light-only SS Lotus theme follows the approved green-to-purple lotus identity in [brand spec](branding/lotus-icon/brand-spec.md).

## Tokens

`src/features/application/design-tokens.css` is the single value source for palette, typography, radius, shadows, layers and spacing. `src/features/application/theme.css` imports it, provides the Tailwind v4 bridge, and owns application composition. The root App Router layout imports the bridge; screen and layout composition lives in features.

| Concern | Contract |
| --- | --- |
| Typography | `Mulish, system-ui, sans-serif` for interface and headings. |
| Page surface | `#f6faf7` background with `#29352f` text; cards are white. |
| Primary action | Green `#287a4b` with white text; hover uses darker green `#21653e` so contrast stays readable. |
| Brand palette | Green `#53b175`, teal `#5b897d`, purple `#69428b`, extracted from the original supplied SVG. |
| Supporting green | `#eaf6ee` surfaces with `#27623d` text; shell blends dark green `#21573c` into dark green `#21653e`. |
| Accent | Soft green `#e3f3e9` with primary green for emphasis, icons and catalog actions. Purple stays within the approved logo. |
| Error | `#8c3f39` destructive/error states. |
| Field border | `#ccd8d1`. |
| Surface border | `#dfe6e2`. |
| Radius | 8px compact, 10px controls, 16px panels and sheets. |
| Spacing | Primitive scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Semantic roles: label→field 8px, field/action group 16/8px, panel 24px desktop/16px mobile, section 32/24px, page 40/16px, dialogs 24/16px. |

Do not add a dark mode, replace Mulish with a shadcn preset font, or substitute the palette with default neutral tokens unless the product design is intentionally changed.

Use the semantic token role rather than a new literal where it applies: `--field-label-gap`, `--field-group-gap`, `--action-gap`, `--panel-padding`, `--section-gap`, `--page-padding`, and dialog/footer tokens. Tailwind utilities such as `p-panel`, `p-dialog`, `gap-action`, and `gap-field-group` are bridges to the same values. Do not override Tailwind's global `--spacing`: it would also alter sizing utilities. Keep the existing literal breakpoints (768/780/1000px), PDF/reader dimensions, grid minimums, sidebar widths, and measured dock offsets as feature geometry rather than design-scale tokens.

## Logo and theme roles

`src/components/brand-logo.tsx` renders the approved app icon from `/brand/lotus-app-icon.svg` beside the SS Lotus name and in the public-library mobile header. It is decorative (`alt=""`) because adjacent text or the control's accessible name supplies identity. The login uses a 64px icon; desktop sidebar uses a 36px icon; the public mobile header displays a 28px icon. SVG copies in `public/brand/` retain all 205 source gradient stops. Metadata points to the real favicon SVG/ICO and a 180px unmasked Apple touch icon derived from the approved square artwork.

Bright brand green is reserved for identity and decorative use: white on `#53b175` has only 2.65:1 contrast. Primary controls, focus and selected states use a darker green derived from the logo green; secondary controls use deep green on a light green surface. Green and white lead the interface; the original purple remains inside the approved logo, rather than becoming a primary UI color. Headings use `--heading-foreground`, emphasis uses `--accent-foreground`; do not reintroduce the old `--gold` or `--deep-green` roles. Keep warning/error colors semantic. The CSS three-color `--brand-gradient` records the identity gradient and is not used for app surfaces; the actual logo retains the complete original SVG gradient. The explicit `--primary-hover` token darkens primary buttons instead of reducing opacity.

## Navigation icons

Use `Home` for Tổng quan, the shared `PrayerHandsIcon` (joined palms) for Cầu An, and Lucide `HeartHandshake` for Hương linh and Cầu siêu metrics. Keep these identities consistent across desktop sidebar, mobile navigation and overview cards. Icons inherit the existing theme color.

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

## Drawer action layout

Every drawer/Sheet form keeps its action footer at the bottom of the visible drawer, even when the form is short. Header and footer do not scroll; only the middle content area scrolls. Give the form the available height with flex/grid and `min-height: 0`, prevent the footer from shrinking, and preserve mobile bottom safe-area padding. Keep submit actions inside their form or associate them with a form ID. Do not position actions immediately after the last field or use a fixed overlay that covers inputs.

## Accessibility

Keep the shell sidebar minimum width explicit: the imported PDF viewer stylesheet also defines `.sidebar` with a 180px minimum. The app overrides it so the imported rule cannot impose a competing minimum width. Selected category labels inherit their selected foreground so labels and counts remain legible on the primary background.

Use primitive-provided semantics and keyboard handling rather than rebuilding overlays manually. Provide a visible `Label` or an accessible name for each field and action. Keep lifecycle safeguards when saving: destructive/cancel actions must not close a pending form, and focus should return to the opening action after a sheet or dialog closes.

## Responsive behavior

Preserve the existing 768px shell breakpoint and 780px catalog/workflow breakpoint. Mobile layout changes should reorganize available space without changing routes, data payloads, Lunar date rules, or browser-side Supabase authentication.

## Application navigation

Landing pages start directly with search, metrics, or settings content. Keep the page heading accessible with `sr-only` instead of adding a large introductory hero. Place create/import/management actions beside the relevant content. Detail pages retain the household or document identity and its useful metadata.

The application sidebar is available on all non-login screens. On desktop it stays 220px wide and always expanded with visible icons and labels; do not add collapse/expand controls or an icon rail. At 768px and below, preserve the menu drawer toggle and existing mobile navigation.

## Library browsing

The admin library opens with published books grouped in category order, a category filter with published counts, and search across title, author, and filename (including Vietnamese queries without accents). Book titles and the Xem action open the existing public reader. Both library lists keep search and category filters together in one sticky surface at the top of the shell's content scroll area. Desktop categories use horizontal wrapping chips; at 780px and below, a compact category select keeps the sticky area short. Detail-reader navigation retains its separate layout.

Quản lý thư viện sits beside the search input (wrapping below it on small screens) and opens a task chooser instead of scrolling to a management section below the books. It offers single PDF upload, batch upload, category management, and interrupted-upload handling. Uploads open their own sheet/dialog; categories and maintenance use separate views within the management dialog, with a back action. Keep the dialog header/footer fixed and scroll only its body. Block closing or changing the management view while a mutation is pending. Closing tools restores focus to their trigger and preserves the catalog's search/category filters. A badge on the trigger counts pending/cleaning/deleting records. Keep the PDF size/retry guidance beside upload tools. Preserve all existing lifecycle safeguards and permissions.
