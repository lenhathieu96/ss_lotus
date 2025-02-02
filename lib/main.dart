import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:ss_lotus/routes/go_router_provider.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:ss_lotus/themes/colors.dart';
import 'package:ss_lotus/utils/constants.dart';
import 'package:ss_lotus/utils/searcher.dart';
import 'package:toastification/toastification.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  setUrlStrategy(PathUrlStrategy());
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  if (kReleaseMode) {
    String siteKey =
        const String.fromEnvironment('FIREBASE_APP_CHECK_SITE_KEY');
    await FirebaseAppCheck.instance
        .activate(webProvider: ReCaptchaV3Provider(siteKey));
  }

  await initializeDateFormatting();
  HouseholdSearcher.init(
      dotenv.env['ALGOLIA_API_KEY'] ?? "", dotenv.env['ALGOLIA_APP_ID'] ?? "");
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
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(COMMON_BORDER_RADIUS)),
        ),
        useMaterial3: true,
      ),
    ));
  }
}
