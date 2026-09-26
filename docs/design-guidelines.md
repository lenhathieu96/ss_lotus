# Design guidelines

## Scope

SS Lotus uses the owned shadcn/Radix source in `src/components/ui` for reusable controls and overlays. This is a component foundation, not a visual redesign: the existing light-only SS Lotus system remains the source of truth.

## Tokens

`src/app/theme.css` owns semantic CSS variables and the Tailwind v4 theme bridge.

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

Do not add a dark mode, replace Mulish with a shadcn preset font, or substitute the palette with default neutral tokens unless the product design is intentionally changed.

## Component use

Use the existing primitives when their semantic role fits:

- `Button` for actions, including the SS Lotus `catalog` variant for catalog secondary actions.
- `Input`, `Label`, `Select`, `Checkbox`, and `RadioGroup` for fields and choices.
- `Card`, `Table`, and `Skeleton` for reusable surfaces, tables, and loading states.
- `Dialog`, `AlertDialog`, `Sheet`, and `Popover` for focus-managed overlays.

Feature CSS belongs with the layout contract in `theme.css` while the app continues to use a shared stylesheet. It may size or arrange a primitive via its class or `data-slot`; it must not reintroduce generic `button`, `input`, `select`, or `label` rules that override the primitive base styles.

## Accessibility

Use primitive-provided semantics and keyboard handling rather than rebuilding overlays manually. Provide a visible `Label` or an accessible name for each field and action. Keep lifecycle safeguards when saving: destructive/cancel actions must not close a pending form, and focus should return to the opening action after a sheet or dialog closes.

## Responsive behavior

Preserve the existing 768px shell breakpoint and 780px catalog/workflow breakpoint. Mobile layout changes should reorganize available space without changing routes, data payloads, Lunar date rules, or browser-side Supabase authentication.
