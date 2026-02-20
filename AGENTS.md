# SS Lotus — Agent Guide

## Session Start Checklist

> Before writing any code, always read these two files:
>
> 1. **[lib/features/household_detail/README.md](lib/features/household_detail/README.md)** — domain model, CRUD operations, validation rules, state machine, Firestore schema. This is the authoritative source of business logic.
> 2. **This file (AGENTS.md)** — tech stack, skills, architecture overview, coding patterns.

---

## Project Context

SS Lotus is a **Flutter web application** for managing Buddhist household registrations (hộ khẩu). It supports viewing, editing, printing, and searching household and family member records, backed by **Cloud Firestore**.

**Version:** 1.0.0+1 | **Flutter SDK:** ^3.6.0 | **Dart SDK:** ^3.6.0

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Flutter (iOS, Android, Web) |
| State Management | Riverpod ^2.6.1 + riverpod_annotation |
| Navigation | GoRouter ^14.8.1 |
| Backend | Cloud Firestore (firebase_core, cloud_firestore) |
| Data Models | Freezed + json_serializable (code generation) |
| Forms | formz ^0.8.0 |
| UI | Material Design 3, flutter_svg, table_calendar |
| Print/PDF | pdf + printing packages |
| Localization | intl + Vietnamese lunar calendar (vnlunar) |
| Notifications | toastification ^2.3.0 |

---

## Skills Registry

Load a skill when working in that area:

```bash
npx openskills read <skill-name>
npx openskills read skill-one,skill-two   # load multiple
```

| Skill | When to load |
|---|---|
| `flutter` | Writing widgets, working with Flutter patterns, Material 3 theming |
| `state-management` | Working with Riverpod providers, Freezed state, dialog providers |
| `navigation` | GoRouter routes, ModalPage, deep linking |
| `firestore` | Repository layer, Firestore CRUD, batched writes, counters |
| `common-tasks` | Step-by-step guides: add a screen, add a dialog, add a widget |
| `component-usage` | AppButton, AppIconButton, InfoBadge, dialog widgets |
| `styling` | AppColors, constants (spacing, shadows, border radius), theme |
| `entities` | Freezed entities, JSON serialization, code generation |
| `printing` | PDF generation with pw.Document, NotoSerif fonts |
| `vietnamese` | Lunar calendar conversions, Vietnamese toast messages |

---

## Architecture Overview

```
lib/
├── main.dart                    # App entry, ProviderScope, Firebase init, ThemeData
├── firebase_options.dart        # Firebase platform config
├── routes/
│   ├── go_router_provider.dart  # @riverpod GoRouter, ModalPage<T>
│   └── route_name.dart          # Route path constants
├── themes/
│   └── colors.dart              # AppColors (semantic) + _Pallet (raw)
├── utils/
│   ├── constants.dart           # Spacing, border radius, dialog sizes, shadows
│   ├── utils.dart               # showToast, lunar date conversion
│   ├── debounce.dart            # Debounce utility for search
│   └── searcher.dart            # Search helper
├── entities/                    # Freezed data models
│   ├── household.dart           # HouseHold entity + buildSearchKeywords
│   ├── user_group.dart          # UserGroup (family) entity
│   ├── user.dart                # User (member) entity
│   ├── appointment.dart         # Appointment entity
│   └── common.enum.dart         # Shared enums (Period, ToastStatus)
├── features/
│   └── household_detail/
│       ├── presentation/
│       │   ├── household_detail_screen.dart
│       │   └── widgets/
│       │       ├── family_list.dart
│       │       ├── family_card.dart
│       │       ├── member_tile.dart
│       │       ├── house_hold_detail_header.dart
│       │       ├── house_hold_detail_footer.dart
│       │       └── print_view.dart
│       ├── provider/
│       │   └── household_detail_provider.dart  # @riverpod HouseHoldDetail notifier
│       ├── repository/
│       │   └── household_detail_repository.dart # Firestore CRUD
│       └── state/
│           └── household_detail_state.dart      # Freezed state class
└── widgets/                     # Shared reusable widgets
    ├── app_button.dart          # AppButton (outlined/elevated)
    ├── app_icon_button.dart     # AppIconButton
    ├── info_badge.dart          # InfoBadge chip
    └── dialog/
        ├── confirmation/        # ConfirmationDialog
        ├── user_profile/        # UserProfileDialog + provider
        ├── family_address/      # FamilyAddressDialog + provider
        ├── appointment_registration/  # AppointmentRegistrationDialog + provider
        └── search_households/   # SearchHouseholdsDialog + provider
```

---

## Quick Start for Agents

### Reading files first
Always read existing files before modifying. Use `Read` on the relevant provider/widget/entity before making changes.

### Code generation
After editing any file with `@riverpod`, `@freezed`, or `@JsonSerializable` annotations, regenerate:
```bash
dart run build_runner build --delete-conflicting-outputs
```

### Running the app
```bash
flutter run -d chrome   # Web
flutter run             # Default device
```

### Checking for issues
```bash
flutter analyze
flutter pub get
```

---

## Key Patterns

### State mutations always use copyWith
```dart
state = state.copyWith(household: updatedHousehold, printable: false);
```

### Dialogs are opened from the provider, not from widgets
```dart
// In provider:
void openUpdateUserProfileDialog(BuildContext context, ...) {
  showDialog(context: context, builder: (_) => UserProfileDialog(...));
}
// In widget:
ref.read(houseHoldDetailProvider.notifier).openUpdateUserProfileDialog(context, ...);
```

### Repository protocol pattern
Always code against the abstract protocol, not the concrete class:
```dart
abstract class HouseHoldDetailRepositoryProtocol {
  Future splitFamily(...);
  Future<HouseHold?> getHouseHoldById(int id, int? oldId);
}
```

### Toast notifications
```dart
Utils.showToast("Cập nhật thành công", ToastStatus.success);
Utils.showToast("Lỗi xảy ra", ToastStatus.error);
```
