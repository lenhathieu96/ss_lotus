# Entities Skill

Freezed data models, JSON serialization, and code generation for SS Lotus entities.

---

## Entity Overview

| Entity | File | Description |
|---|---|---|
| `HouseHold` | `lib/entities/household.dart` | Top-level household with families and appointment |
| `UserGroup` | `lib/entities/user_group.dart` | A family within a household |
| `User` | `lib/entities/user.dart` | A member within a family |
| `Appointment` | `lib/entities/appointment.dart` | Appointment/event associated with a household |

Shared enums:
- `Period` — appointment period (morning, afternoon, etc.)
- `ToastStatus` — `success` / `error` for toast notifications

---

## Freezed Entity Pattern

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'my_entity.freezed.dart';
part 'my_entity.g.dart';

@freezed
abstract class MyEntity with _$MyEntity {
  const factory MyEntity({
    required int id,
    required String name,
    String? optionalField,
    @Default([]) List<String> items,
  }) = _MyEntity;

  factory MyEntity.fromJson(Map<String, Object?> json) =>
      _$MyEntityFromJson(json);
}
```

After any change, regenerate:
```bash
dart run build_runner build --delete-conflicting-outputs
```

---

## HouseHold Entity

```dart
@freezed
abstract class HouseHold with _$HouseHold {
  const factory HouseHold({
    required int id,
    int? oldId,
    required List<UserGroup> families,
    Appointment? appointment,
    @Default([]) List<String> searchKeywords,
  }) = _HouseHold;

  factory HouseHold.fromJson(Map<String, Object?> json) =>
      _$HouseHoldFromJson(json);

  // Builds flat normalized keywords for Firestore search
  static List<String> buildSearchKeywords(HouseHold household) { ... }
}
```

---

## UserGroup (Family) Entity

```dart
@freezed
abstract class UserGroup with _$UserGroup {
  const factory UserGroup({
    required int id,
    required String address,
    required List<User> members,
  }) = _UserGroup;

  factory UserGroup.fromJson(Map<String, Object?> json) =>
      _$UserGroupFromJson(json);
}
```

---

## User (Member) Entity

```dart
@freezed
abstract class User with _$User {
  const factory User({
    required String fullName,
    String? christineName,   // dharma name
    int? yob,                // year of birth
  }) = _User;

  factory User.fromJson(Map<String, Object?> json) => _$UserFromJson(json);
}
```

---

## copyWith Usage

Freezed generates `copyWith` for all entities:

```dart
// Update a household's families
final updated = household.copyWith(families: newFamilies);

// Update a specific family's address
final updatedFamily = family.copyWith(address: 'Số 10 Lê Lợi');

// Add a member to a family
final updatedFamily = family.copyWith(
  members: [...family.members, newUser],
);
```

---

## Adding a New Entity

1. Create `lib/entities/my_entity.dart` with the pattern above
2. Add `part 'my_entity.freezed.dart';` and `part 'my_entity.g.dart';`
3. Run `dart run build_runner build --delete-conflicting-outputs`
4. Generated files `my_entity.freezed.dart` and `my_entity.g.dart` will be created

---

## JSON Serialization Notes

- Firestore documents are read with `fromJson` and written with `toJson()`
- `@Default([])` annotates lists with empty defaults so missing Firestore fields don't throw
- Nested entities (e.g., `List<UserGroup>` in `HouseHold`) are automatically serialized if they also have `fromJson`/`toJson`

```dart
// Writing to Firestore
final json = household.toJson();
await householdRef.doc(household.id.toString()).set(json);

// Reading from Firestore
final household = HouseHold.fromJson(doc.data() as Map<String, dynamic>);
```
