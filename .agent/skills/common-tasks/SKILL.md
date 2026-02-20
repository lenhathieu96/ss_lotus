# Common Tasks Skill

Step-by-step guides for frequent development tasks in SS Lotus.

---

## Add a New Screen

1. Create `lib/features/<feature>/presentation/<feature>_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(child: Text('Reports')),
    );
  }
}
```

2. Add a route in `lib/routes/go_router_provider.dart`:

```dart
GoRoute(
  path: "/reports",
  builder: (context, state) => const ReportsScreen(),
),
```

3. Regenerate:
```bash
dart run build_runner build --delete-conflicting-outputs
```

---

## Add a New Riverpod Provider

1. Create `lib/features/<feature>/provider/<feature>_provider.dart`:

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../state/<feature>_state.dart';

part '<feature>_provider.g.dart';

@riverpod
class MyFeature extends _$MyFeature {
  @override
  MyFeatureState build() => MyFeatureState();

  void doAction() {
    state = state.copyWith(loading: true);
    // ...
  }
}
```

2. Create `lib/features/<feature>/state/<feature>_state.dart`:

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part '<feature>_state.freezed.dart';

@freezed
abstract class MyFeatureState with _$MyFeatureState {
  const factory MyFeatureState({
    @Default(false) bool loading,
  }) = _MyFeatureState;
}
```

3. Run build_runner.

---

## Add a New Dialog

1. Create `lib/widgets/dialog/<name>/<name>_dialog.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/widgets/app_button.dart';

class MyDialog extends ConsumerWidget {
  final void Function(String result) onConfirm;
  const MyDialog({super.key, required this.onConfirm});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Dialog(
      child: Container(
        width: MediaQuery.sizeOf(context).width * DIALOG_SM,
        padding: const EdgeInsets.all(SPACE_LG),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Title', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: SPACE_MD),
            AppButton(
              variant: AppButtonVariant.elevated,
              label: 'Xác nhận',
              color: AppColors.actionPrimary,
              onPressed: () {
                Navigator.of(context).pop();
                onConfirm('result');
              },
            ),
          ],
        ),
      ),
    );
  }
}
```

2. Add an open method to the relevant provider notifier:

```dart
void openMyDialog(BuildContext context) {
  showDialog(
    context: context,
    builder: (_) => MyDialog(
      onConfirm: (result) => _handleResult(result),
    ),
  );
}
```

---

## Add a New Entity

1. Create `lib/entities/<name>.dart`:

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part '<name>.freezed.dart';
part '<name>.g.dart';

@freezed
abstract class MyEntity with _$MyEntity {
  const factory MyEntity({
    required int id,
    required String name,
    String? optional,
    @Default([]) List<String> items,
  }) = _MyEntity;

  factory MyEntity.fromJson(Map<String, Object?> json) =>
      _$MyEntityFromJson(json);
}
```

2. Run build_runner.

---

## Update Household State

Pattern for any state mutation in `household_detail_provider.dart`:

```dart
void _updateSomething(int familyId, String newValue) {
  final currentHouseHold = state.household;
  if (currentHouseHold == null) return;

  final updatedFamilies = currentHouseHold.families.map((family) {
    if (family.id == familyId) {
      return family.copyWith(/* changed fields */);
    }
    return family;
  }).toList();

  state = state.copyWith(
    printable: false,   // always reset printable on edit
    household: currentHouseHold.copyWith(families: updatedFamilies),
  );
}
```

---

## Add a Shared Widget

1. Create `lib/widgets/<name>.dart`
2. Follow the `ConsumerWidget` or `StatelessWidget` pattern
3. Accept only what's needed as constructor params
4. Import from `ss_lotus/widgets/<name>.dart` in consumers

---

## Search Households (Firestore)

The search dialog queries Firestore using `array-contains-any` on `searchKeywords`:

```dart
// Conceptually (from search_households_dialog_provider.dart):
householdRef
  .where('searchKeywords', arrayContainsAny: tokens)
  .limit(10)
  .get()
```

Search keywords are built by `HouseHold.buildSearchKeywords`:
- NFC-normalized
- Lowercase
- Split on whitespace

When saving, always call `_toJsonWithKeywords(household)` to keep keywords fresh.

---

## Show a Toast

```dart
import 'package:ss_lotus/utils/utils.dart';
import 'package:ss_lotus/entities/common.enum.dart';

Utils.showToast("Cập nhập thành công", ToastStatus.success);
Utils.showToast("Mã số đã tồn tại", ToastStatus.error);
```

---

## Print a Household to PDF

Triggered from the footer's Print button, handled in the provider:

```dart
Future<void> onPrint() async {
  if (state.household == null) return;

  final doc = pw.Document();
  final pageFont = await fontFromAssetBundle('assets/fonts/NotoSerif-Regular.ttf');
  final pageBoldFont = await fontFromAssetBundle('assets/fonts/NotoSerif-Bold.ttf');
  final logo = await imageFromAssetBundle('assets/images/dharmachakra.png');

  doc.addPage(buildPrintPage(logo, pageFont, pageBoldFont, state.household!));

  await Printing.layoutPdf(
    onLayout: (PdfPageFormat format) async => doc.save(),
  );
}
```

The `buildPrintPage` function is in `lib/features/household_detail/presentation/widgets/print_view.dart`.
