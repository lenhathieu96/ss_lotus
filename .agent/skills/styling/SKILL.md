# Styling Skill

AppColors, spacing constants, shadow presets, and Material 3 theme conventions for SS Lotus.

---

## Color System

Colors are defined in `lib/themes/colors.dart`. Always use semantic tokens from `AppColors`, not raw palette values.

### Semantic Tokens (use these)

```dart
import 'package:ss_lotus/themes/colors.dart';

// Actions
AppColors.actionPrimary      // sageGreen — primary CTA, links
AppColors.actionSecondary    // blue50 — secondary actions
AppColors.actionDanger       // warmRed — delete, destructive
AppColors.actionWarning      // deepGold — warnings
AppColors.actionSuccess      // sageGreen — success states
AppColors.actionSchedule     // warmPurple — appointments/calendar

// Surfaces
AppColors.surfaceBackground  // warmCream — page/scaffold background
AppColors.surfaceCard        // white — card/dialog background
AppColors.surfaceCardAlt     // warmGray20 — alt card, input fill
AppColors.surfaceDivider     // warmGray30 — dividers, borders

// Text
AppColors.textPrimary        // warmDark — headings, labels
AppColors.textSecondary      // warmMedium — body, descriptions
AppColors.textTertiary       // warmLight — hints, placeholder

// Other
AppColors.primary            // forestGreen — brand/seed color
AppColors.border             // warmGray30 — border color
AppColors.transparent        // Colors.transparent
AppColors.white              // pure white
```

### Raw Palette (avoid in UI — use for one-off accents with withValues)

```dart
AppColors.pallet.forestGreen   // #53B175 — logo brand green
AppColors.pallet.sageGreen     // #45A065
AppColors.pallet.deepGold      // #E09600
AppColors.pallet.warmPurple    // #8A5BB5
AppColors.pallet.warmRed       // #E84848
// etc.
```

Example: tinted icon background
```dart
Container(
  decoration: BoxDecoration(
    shape: BoxShape.circle,
    color: AppColors.pallet.forestGreen.withValues(alpha: 0.12),
  ),
  child: Icon(Icons.person, color: AppColors.actionPrimary),
)
```

---

## Spacing Constants

From `lib/utils/constants.dart`:

```dart
SPACE_XS = 4.0    // tight spacing, icon gaps
SPACE_SM = 8.0    // between related items
SPACE_MD = 16.0   // standard content padding
SPACE_LG = 24.0   // section separation
SPACE_XL = 32.0   // large layout gaps

COMMON_PADDING        = 16.0   // standard edge insets
COMMON_BORDER_RADIUS  = 16.0   // cards, dialogs, inputs
COMMON_SPACING        = 8.0    // generic gap
TOOLBAR_ELEMENT_HEIGHT = 44.0  // buttons/toolbar height
```

---

## Dialog Sizing

Dialogs use a fraction of screen width:

```dart
DIALOG_SM = 0.35   // user profile, confirmation
DIALOG_MD = 0.5    // address form, appointment
DIALOG_LG = 0.7    // search households

// Usage
Container(
  width: MediaQuery.sizeOf(context).width * DIALOG_SM,
  ...
)
```

---

## Shadow Presets

```dart
// Subtle card shadow
Container(
  decoration: BoxDecoration(boxShadow: SHADOW_SM),
)

// Floating card
Container(
  decoration: BoxDecoration(boxShadow: SHADOW_MD),
)

// Modal/overlay
Container(
  decoration: BoxDecoration(boxShadow: SHADOW_LG),
)
```

---

## Global Theme (main.dart)

These theme tokens are set globally — use them via `Theme.of(context)`:

```dart
// Text styles
Theme.of(context).textTheme.headlineLarge   // 28, bold
Theme.of(context).textTheme.titleLarge      // 20, semibold
Theme.of(context).textTheme.titleMedium     // 16, semibold
Theme.of(context).textTheme.bodyLarge       // 16, normal
Theme.of(context).textTheme.bodyMedium      // 14, normal (textSecondary color)
Theme.of(context).textTheme.labelLarge      // 14, medium

// Card theme: elevation 0, COMMON_BORDER_RADIUS, surfaceCard color
// Dialog theme: COMMON_BORDER_RADIUS, surfaceCard color
// Input theme: filled, surfaceCardAlt fill, border on focus uses actionPrimary
// Button themes: all use COMMON_BORDER_RADIUS and Mulish font
```

---

## Typography

Font family is **Mulish** (loaded from assets). All TextStyle in the app should inherit this from the theme.

For print views only, use **NotoSerif** (Regular/Bold) to support Vietnamese characters.

```dart
// Print only
final pageFont = await fontFromAssetBundle('assets/fonts/NotoSerif-Regular.ttf');
final pageBoldFont = await fontFromAssetBundle('assets/fonts/NotoSerif-Bold.ttf');
```

---

## Input Decoration (from theme)

Inputs automatically get:
- Filled background (`surfaceCardAlt`)
- Rounded border with `COMMON_BORDER_RADIUS`
- Focus highlight with `actionPrimary`
- Hint/label color `textTertiary`

No need to set `InputDecoration` manually unless overriding:

```dart
TextFormField(
  decoration: InputDecoration(
    labelText: 'Tên',
    errorText: formState.name.isNotValid ? formState.name.error : null,
  ),
  ...
)
```
