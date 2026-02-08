import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../features/household_detail/presentation/household_detail_screen.dart';
import '../features/login/presentation/login_screen.dart';

part 'go_router_provider.g.dart';

class ModalPage<T> extends Page<T> {
  const ModalPage({required this.child});

  final Widget child;

  @override
  Route<T> createRoute(BuildContext context) => ModalBottomSheetRoute<T>(
        settings: this,
        isScrollControlled: true,
        enableDrag: false,
        isDismissible: false,
        constraints:
            BoxConstraints(minWidth: MediaQuery.sizeOf(context).width),
        backgroundColor: Colors.transparent,
        builder: (context) => child,
      );
}

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

@riverpod
GoRouter goRouter(Ref ref) {
  return GoRouter(
    navigatorKey: rootNavigatorKey, // Set the root navigator key
    initialLocation: "/household", // Set the default path
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
