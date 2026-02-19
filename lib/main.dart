import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:ss_lotus/routes/go_router_provider.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:toastification/toastification.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  usePathUrlStrategy();
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  await initializeDateFormatting();
  runApp(const ProviderScope(
    child: MyApp(),
  ));
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goRouter = ref.watch(goRouterProvider);

    return ToastificationWrapper(
        child: MaterialApp.router(
      debugShowCheckedModeBanner: false,
      routerConfig: goRouter,
      theme: ThemeData(
        fontFamily: "Mulish",
        colorScheme: ColorScheme.fromSeed(seedColor: AppColors.primary),
        scaffoldBackgroundColor: AppColors.surfaceBackground,
        textTheme: TextTheme(
          headlineLarge: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
          titleLarge: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          titleMedium: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
          bodyLarge: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.normal,
            color: AppColors.textPrimary,
          ),
          bodyMedium: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.normal,
            color: AppColors.textSecondary,
          ),
          labelLarge: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary,
          ),
        ),
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
          color: AppColors.surfaceCard,
        ),
        dialogTheme: DialogThemeData(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
          backgroundColor: AppColors.surfaceCard,
        ),
        dividerTheme: DividerThemeData(
          color: AppColors.surfaceDivider,
          thickness: 0.5,
        ),
        tooltipTheme: TooltipThemeData(
          textStyle: TextStyle(fontFamily: "Mulish", fontSize: 12, color: Colors.white),
        ),
        iconTheme: const IconThemeData(
          size: 20,
        ),
        filledButtonTheme: FilledButtonThemeData(
            style: ButtonStyle(
                foregroundColor: WidgetStatePropertyAll(Colors.white),
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                    fontSize: 15.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                padding: WidgetStatePropertyAll(
                  EdgeInsets.symmetric(
                      horizontal: 1.5 * COMMON_PADDING,
                      vertical: COMMON_PADDING),
                ),
                shape: WidgetStatePropertyAll(RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(COMMON_BORDER_RADIUS))))),
        outlinedButtonTheme: OutlinedButtonThemeData(
            style: ButtonStyle(
                foregroundColor: WidgetStatePropertyAll(AppColors.actionPrimary),
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                    fontSize: 15.0,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                padding: WidgetStatePropertyAll(
                  EdgeInsets.symmetric(
                      horizontal: 1.5 * COMMON_PADDING,
                      vertical: COMMON_PADDING),
                ),
                shape: WidgetStatePropertyAll(RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(COMMON_BORDER_RADIUS))))),
        textButtonTheme: TextButtonThemeData(
            style: ButtonStyle(
                foregroundColor: WidgetStatePropertyAll(AppColors.actionPrimary),
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                      fontSize: 15.0,
                      fontWeight: FontWeight.w600,
                      fontFamily: "Mulish"),
                ),
                overlayColor: WidgetStatePropertyAll(Colors.transparent),
                padding: WidgetStatePropertyAll(
                  EdgeInsets.symmetric(
                      horizontal: 1.5 * COMMON_PADDING,
                      vertical: COMMON_PADDING),
                ),
                shape: WidgetStatePropertyAll(RoundedRectangleBorder(
                    borderRadius:
                        BorderRadius.circular(COMMON_BORDER_RADIUS))))),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surfaceCardAlt,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS),
            borderSide: BorderSide(color: AppColors.surfaceDivider),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS),
            borderSide: BorderSide(color: AppColors.surfaceDivider),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS),
            borderSide: BorderSide(color: AppColors.actionPrimary, width: 1.5),
          ),
          labelStyle: TextStyle(color: AppColors.textTertiary, fontSize: 13, fontWeight: FontWeight.w600),
          hintStyle: TextStyle(color: AppColors.textTertiary),
        ),
        useMaterial3: true,
      ),
    ));
  }
}
