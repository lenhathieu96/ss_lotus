# Flutter Skill

Flutter patterns, Material Design 3 theming, and widget conventions for SS Lotus.

---

## Widget Structure

### ConsumerWidget (read-only state)
```dart
class MyWidget extends ConsumerWidget {
  const MyWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(houseHoldDetailProvider);
    return Text(state.household?.id.toString() ?? '–');
  }
}
```

### ConsumerStatefulWidget (local state + Riverpod)
```dart
class MyWidget extends ConsumerStatefulWidget {
  const MyWidget({super.key});

  @override
  ConsumerState<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends ConsumerState<MyWidget> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) { ... }
}
```

---

## Material 3 Theme

The global theme is set in `main.dart`. Use theme tokens — never hardcode colors or font sizes.

```dart
// ✅ Correct — use AppColors and theme text styles
Text('Hello', style: Theme.of(context).textTheme.titleMedium)
Container(color: AppColors.surfaceCard)

// ❌ Wrong — hardcoded values
Text('Hello', style: TextStyle(fontSize: 16, color: Color(0xFF1A2820)))
Container(color: Color(0xFFFFFFFF))
```

### Text styles available
| Token | Size | Weight | Use |
|---|---|---|---|
| `headlineLarge` | 28 | Bold | Page titles |
| `titleLarge` | 20 | SemiBold | Section headers |
| `titleMedium` | 16 | SemiBold | Card titles |
| `bodyLarge` | 16 | Normal | Primary body text |
| `bodyMedium` | 14 | Normal | Secondary / captions |
| `labelLarge` | 14 | Medium | Labels, buttons |

---

## Spacing and Layout

Use constants from `lib/utils/constants.dart`:

```dart
import 'package:ss_lotus/utils/constants.dart';

// Spacing scale
SPACE_XS  = 4.0
SPACE_SM  = 8.0
SPACE_MD  = 16.0
SPACE_LG  = 24.0
SPACE_XL  = 32.0

// Common
COMMON_PADDING       = 16.0
COMMON_BORDER_RADIUS = 16.0
COMMON_SPACING       = 8.0
TOOLBAR_ELEMENT_HEIGHT = 44.0

// Dialog widths (fraction of screen width)
DIALOG_SM = 0.35
DIALOG_MD = 0.5
DIALOG_LG = 0.7

// Shadow presets
SHADOW_SM / SHADOW_MD / SHADOW_LG

// Usage
SizedBox(height: SPACE_MD)
Padding(padding: EdgeInsets.all(COMMON_PADDING), ...)
Container(width: MediaQuery.sizeOf(context).width * DIALOG_SM, ...)
```

---

## Button Widgets

### AppButton
```dart
import 'package:ss_lotus/widgets/app_button.dart';

// Outlined (default)
AppButton(
  label: 'Tách gia đình',
  color: AppColors.actionDanger,
  onPressed: () { ... },
  icon: Icons.call_split,  // optional
  compact: true,           // optional — shrink padding
)

// Elevated (filled)
AppButton(
  variant: AppButtonVariant.elevated,
  label: 'Lưu thay đổi',
  color: AppColors.actionPrimary,
  onPressed: onSave,
)
```

### AppIconButton
```dart
import 'package:ss_lotus/widgets/app_icon_button.dart';

AppIconButton(
  icon: Icons.close,
  iconSize: 20,
  onPressed: () => Navigator.of(context).pop(),
)
```

---

## Dialog Pattern

All dialogs follow the same structure:
1. Use `Dialog` or `AlertDialog` with `COMMON_BORDER_RADIUS`
2. Set `backgroundColor: AppColors.surfaceCard`
3. Set width via `MediaQuery.sizeOf(context).width * DIALOG_SM`
4. Open via the notifier method, not directly in the widget

```dart
// Widget calls provider method:
ref.read(houseHoldDetailProvider.notifier)
   .openUpdateUserProfileDialog(context, familyId, user, index);

// Provider shows dialog:
void openUpdateUserProfileDialog(...) {
  showDialog(
    context: context,
    builder: (_) => UserProfileDialog(...),
  );
}
```

---

## Responsive Layout

The app is used primarily as a web app. Use `LayoutBuilder` or `MediaQuery` for responsive grids:

```dart
// Example: 1 column if 1 family, 2 if 2, 3 if 3+
int crossAxisCount = families.length == 1 ? 1
    : families.length == 2 ? 2
    : 3;
```

---

## Common Patterns

### Show toast
```dart
Utils.showToast("Cập nhập thành công", ToastStatus.success);
Utils.showToast("Lỗi: không tìm thấy", ToastStatus.error);
```

### Pop dialog
```dart
Navigator.of(context).pop();
```

### Conditional rendering
```dart
if (condition) ...[
  SizedBox(height: SPACE_SM),
  Text(desc!),
],
```
