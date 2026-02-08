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
        cardTheme: CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
          color: AppColors.surfaceCard,
        ),
        dialogTheme: DialogThemeData(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(SPACE_MD)),
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
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                    fontSize: 16.0, // Adjust the font size as needed
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
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                    fontSize: 16.0, // Adjust the font size as needed
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
                textStyle: WidgetStatePropertyAll(
                  TextStyle(
                      fontSize: 16.0,
                      fontFamily: "Mulish" // Adjust the font size as needed
                      ),
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
          fillColor: AppColors.surfaceBackground,
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
          labelStyle: TextStyle(color: AppColors.textTertiary),
          hintStyle: TextStyle(color: AppColors.textTertiary),
        ),
        useMaterial3: true,
      ),
    ));
  }
}
