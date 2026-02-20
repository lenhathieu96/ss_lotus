# Component Usage Skill

API reference and usage patterns for all shared widgets and dialogs in SS Lotus.

---

## AppButton

**File:** `lib/widgets/app_button.dart`

Two variants: `outlined` (default) and `elevated` (filled).

```dart
import 'package:ss_lotus/widgets/app_button.dart';

// Outlined — for secondary/destructive actions
AppButton(
  label: 'Tách gia đình',
  color: AppColors.actionDanger,
  onPressed: () { ... },
)

// Outlined with icon
AppButton(
  label: 'Thêm gia đình',
  color: AppColors.actionPrimary,
  icon: Icons.add,
  onPressed: () { ... },
)

// Outlined compact — for inline buttons in cards
AppButton(
  label: 'Tách',
  color: AppColors.actionDanger,
  compact: true,
  onPressed: () { ... },
)

// Elevated — for primary/save actions
AppButton(
  variant: AppButtonVariant.elevated,
  label: 'Lưu thay đổi',
  color: AppColors.actionPrimary,
  onPressed: isSaving ? null : onSave,  // null disables button
)

// Disabled state — pass null to onPressed
AppButton(
  label: 'In',
  color: AppColors.actionPrimary,
  onPressed: canPrint ? onPrint : null,
)
```

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `String` | required | Button text |
| `color` | `Color` | required | Border/fill color |
| `onPressed` | `VoidCallback?` | required | null = disabled |
| `icon` | `IconData?` | null | Optional leading icon |
| `variant` | `AppButtonVariant` | `outlined` | outlined or elevated |
| `compact` | `bool` | false | Shrink padding |

---

## AppIconButton

**File:** `lib/widgets/app_icon_button.dart`

Icon-only compact button, used in dialog headers and card actions.

```dart
import 'package:ss_lotus/widgets/app_icon_button.dart';

AppIconButton(
  icon: Icons.close,
  iconSize: 20,
  onPressed: () => Navigator.of(context).pop(),
)

AppIconButton(
  icon: Icons.edit_outlined,
  onPressed: () { ... },
)
```

---

## InfoBadge

**File:** `lib/widgets/info_badge.dart`

Chip/badge for displaying status labels.

```dart
import 'package:ss_lotus/widgets/info_badge.dart';

InfoBadge(label: 'Đã đăng ký')
InfoBadge(label: 'Chưa đăng ký', color: AppColors.textTertiary)
```

---

## ConfirmationDialog

**File:** `lib/widgets/dialog/confirmation/confirmation_dialog.dart`

Generic confirmation modal with warning icon and cancel/confirm buttons.

```dart
import 'package:ss_lotus/widgets/dialog/confirmation/confirmation_dialog.dart';

showDialog(
  context: context,
  builder: (_) => ConfirmationDialog(
    title: 'Xoá người này',
    desc: 'Bạn có chắc chắn muốn xoá?',  // optional
    onConfirm: () => doDelete(),
  ),
);
```

**Props:** `title` (required), `desc` (optional), `onConfirm` (required callback)

The cancel button ("Không") pops the dialog. The confirm button ("Có") pops then calls `onConfirm`.

---

## UserProfileDialog

**File:** `lib/widgets/dialog/user_profile/user_profile_dialog.dart`
**Provider:** `lib/widgets/dialog/user_profile/user_profile_dialog_provider.dart`

Form dialog for creating or editing a Buddhist member (phật tử). Always open via the provider notifier.

```dart
// Via provider (preferred)
ref.read(houseHoldDetailProvider.notifier)
   .openUpdateUserProfileDialog(context, familyId, existingUser, userIndex);
   // userIndex = null → add new member
   // userIndex = int  → update existing member at that index

// Fields: Tên (fullName), Pháp danh (christineName)
// Both fields stored as UPPERCASE in the User entity
```

---

## FamilyAddressDialog

**File:** `lib/widgets/dialog/family_address/family_address_dialog.dart`
**Provider:** `lib/widgets/dialog/family_address/family_address_dialog_provider.dart`

Form dialog for adding a new family or updating an existing family address.

```dart
// Via provider notifier
ref.read(houseHoldDetailProvider.notifier)
   .openAddNewFamilyDialog(
     context,
     familyId,          // null = add new family
     defaultAddress,    // null = add new family
     allowInitHouseHold, // true = allow entering a manual household ID
   );
```

**Behavior:**
- `familyId == null` → creates a new family (auto-ID or manual ID)
- `familyId != null` → updates address of existing family
- `allowInitHouseHold: true` → shows household ID input field for creating a new household

---

## AppointmentRegistrationDialog

**File:** `lib/widgets/dialog/appointment_registration/appointment_registration_dialog.dart`

Form dialog for scheduling an appointment for the household.

```dart
ref.read(houseHoldDetailProvider.notifier)
   .openAppointmentRegistrationDialog(context, existingAppointment);
   // existingAppointment = null → create new appointment
```

---

## SearchHouseholdsDialog

**File:** `lib/widgets/dialog/search_households/search_households_dialog.dart`
**Provider:** `lib/widgets/dialog/search_households/search_households_dialog_provider.dart`

Search and select a household by ID, member name, or address. Uses Firestore `array-contains-any` with normalized search tokens.

```dart
// Two modes:

// 1. Combine family mode — shows combine confirmation dialog after selection
ref.read(houseHoldDetailProvider.notifier)
   .openSearchHouseholdsDialog(context, true);

// 2. Select household mode — replaces current household in view
ref.read(houseHoldDetailProvider.notifier)
   .openSearchHouseholdsDialog(context, false);
```

**UI features:**
- Real-time search with debounce
- Shows household ID, old ID, family addresses, and member names in results
- "Thêm gia đình mới" button (shown when `onAddNewFamily` callback is provided)

---

## Dialogs: General Rules

1. **Always open dialogs via the provider notifier** — not directly in widget `onPressed`
2. **Dialog width** uses `MediaQuery.sizeOf(context).width * DIALOG_*` constants
3. **Close dialogs** with `Navigator.of(context).pop()`
4. **Dialog providers** manage isolated form state using Riverpod family params
5. **Callbacks** (`onProfileUpdated`, `onAddressUpdated`, etc.) are passed in at construction and called before popping
