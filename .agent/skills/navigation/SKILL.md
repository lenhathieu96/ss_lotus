# Navigation Skill

GoRouter patterns, route definitions, and modal navigation for SS Lotus.

---

## Router Setup

The router is a Riverpod-managed GoRouter provider:

```dart
// lib/routes/go_router_provider.dart

@riverpod
GoRouter goRouter(Ref ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: "/household",
    routes: [
      GoRoute(
        path: "/login",
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: "/household",
        builder: (context, state) => const HouseHoldDetailScreen(),
      ),
    ],
  );
}
```

The root navigator key is globally accessible:
```dart
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();
```

---

## Route Constants

Define route paths in `lib/routes/route_name.dart`:

```dart
// Usage
context.go('/household');
context.push('/login');
```

---

## Adding a New Route

1. Create the screen file in `lib/features/<feature>/presentation/<screen>_screen.dart`
2. Add a `GoRoute` entry in `go_router_provider.dart`
3. Run `dart run build_runner build` to regenerate `go_router_provider.g.dart`

```dart
GoRoute(
  path: "/reports",
  builder: (context, state) => const ReportsScreen(),
),
```

---

## Modal Bottom Sheet via ModalPage

Use `ModalPage<T>` (defined in `go_router_provider.dart`) for full-screen modal routes:

```dart
class ModalPage<T> extends Page<T> {
  const ModalPage({required this.child});
  final Widget child;

  @override
  Route<T> createRoute(BuildContext context) => ModalBottomSheetRoute<T>(
        settings: this,
        isScrollControlled: true,
        enableDrag: false,
        isDismissible: false,
        constraints: BoxConstraints(minWidth: MediaQuery.sizeOf(context).width),
        backgroundColor: Colors.transparent,
        builder: (context) => child,
      );
}
```

Usage in routes:
```dart
GoRoute(
  path: "/my-modal",
  pageBuilder: (context, state) => ModalPage(child: MyModalWidget()),
),
```

---

## Dialog Navigation (not GoRouter)

Most in-app dialogs are shown with `showDialog`, not GoRouter. They are opened from the notifier:

```dart
// In provider notifier
void openConfirmDialog(BuildContext context, String title, VoidCallback onConfirm) {
  showDialog(
    context: context,
    builder: (_) => ConfirmationDialog(
      title: title,
      onConfirm: onConfirm,
    ),
  );
}

// In widget
ref.read(houseHoldDetailProvider.notifier)
   .openConfirmDialog(context, 'Xoá người này?', () => doDelete());
```

Dismiss a dialog:
```dart
Navigator.of(context).pop();
```

---

## Navigation from Outside Widget Tree

Use `rootNavigatorKey` when navigation is needed from outside a widget context (e.g., from a provider):

```dart
rootNavigatorKey.currentContext!;  // access context
```

---

## GoRouter Navigation Methods

```dart
context.go('/household');       // replace current route
context.push('/login');         // push onto stack
context.pop();                  // go back
context.goNamed('household');   // named route (if configured)
```
