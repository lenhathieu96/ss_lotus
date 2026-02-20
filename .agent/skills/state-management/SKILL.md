# State Management Skill

Riverpod patterns, Freezed state classes, and dialog providers for SS Lotus.

---

## When to Use Each Pattern

| Pattern | Use when |
|---|---|
| `ref.watch(provider)` | Reactively rebuild widget on state change |
| `ref.read(provider.notifier)` | Call a method without subscribing to changes |
| `ref.read(provider)` | Read state once without subscription (inside callbacks) |
| Local `setState` | Pure local UI state with no cross-widget sharing |
| Dialog providers | Scoped form state inside a dialog |

---

## Class-Based Notifier (@riverpod)

All feature state is managed by a `@riverpod` class extending `_$ClassName`:

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'my_feature_provider.g.dart';

@riverpod
class MyFeature extends _$MyFeature {
  @override
  MyFeatureState build() {
    return MyFeatureState();  // initial state
  }

  void doSomething() {
    state = state.copyWith(loading: true);
    // ... async work
    state = state.copyWith(loading: false, result: data);
  }
}
```

After editing, regenerate:
```bash
dart run build_runner build --delete-conflicting-outputs
```

---

## Freezed State Classes

State is always an immutable Freezed class:

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'my_feature_state.freezed.dart';

@freezed
abstract class MyFeatureState with _$MyFeatureState {
  const factory MyFeatureState({
    HouseHold? household,
    @Default(false) bool loading,
    @Default(false) bool printable,
  }) = _MyFeatureState;
}
```

Usage:
```dart
// ✅ Always use copyWith — never mutate
state = state.copyWith(household: updated, printable: false);

// ❌ Never mutate directly
state.household = updated;
```

---

## HouseholdDetailState — Main State

```dart
// lib/features/household_detail/state/household_detail_state.dart

@freezed
abstract class HouseholdDetailState with _$HouseholdDetailState {
  const factory HouseholdDetailState({
    HouseHold? unusedHouseHold,
    HouseHold? household,
    @Default(false) bool printable,
    @Default(false) bool isInitHousehold,
    @Default([]) List<UserGroup> suggestedFamilies,
  }) = _HouseholdDetailState;
}
```

Key flags:
- `household` — the currently selected/edited household (null = empty state)
- `printable` — true only after a successful save; set to false on any edit
- `isInitHousehold` — true when creating a brand new household
- `unusedHouseHold` — previous household reference during household switch

---

## Dialog Providers

Each dialog with form state has its own `@riverpod` provider scoped to the dialog widget tree. These providers take the initial value as a parameter (family param).

```dart
// Pattern: family param = the initial value passed to the dialog
@riverpod
class UserProfileForm extends _$UserProfileForm {
  @override
  UserProfileFormState build(User? user) {
    return UserProfileFormState(
      name: NameInput.dirty(user?.fullName ?? ''),
      christineName: ChristineNameInput.dirty(user?.christineName ?? ''),
    );
  }

  void updateName(String value) {
    state = state.copyWith(name: NameInput.dirty(value));
  }
}
```

Consuming in the dialog:
```dart
final formState = ref.watch(userProfileFormProvider(user));
final formNotifier = ref.read(userProfileFormProvider(user).notifier);
```

---

## Reading State in Widgets

```dart
class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Subscribe — rebuilds when state changes
    final state = ref.watch(houseHoldDetailProvider);

    // ✅ Access the notifier for callbacks
    return ElevatedButton(
      onPressed: () =>
        ref.read(houseHoldDetailProvider.notifier).onSaveChanges(),
      child: Text('Save'),
    );
  }
}
```

---

## Repository Access in Provider

Providers access the repository via `ref.read` inside `build()`:

```dart
@riverpod
class HouseHoldDetail extends _$HouseHoldDetail {
  late final HouseHoldDetailRepositoryProtocol _repository;

  @override
  HouseholdDetailState build() {
    _repository = ref.read(houseHoldDetailRepositoryProvider);
    return HouseholdDetailState();
  }
}
```

---

## Common State Mutations

```dart
// After save — mark printable
state = state.copyWith(printable: true, unusedHouseHold: null, isInitHousehold: false);

// Any edit — clear printable
state = state.copyWith(printable: false, household: updatedHousehold);

// Clear household (back to empty state)
state = state.copyWith(household: null);
```
