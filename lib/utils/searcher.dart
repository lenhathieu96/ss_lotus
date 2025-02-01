import 'package:algolia_helper_flutter/algolia_helper_flutter.dart';

class HouseholdSearcher {
  static HouseholdSearcher? _instance;

  // Private constructor to prevent direct instantiation
  HouseholdSearcher._internal(String apiKey, String appId)
      : _householdSearcher = HitsSearcher(
          applicationID: "TMHHDJJ8E0",
          apiKey: "12c2ef492e2549bac78756caaf90f6fd",
          indexName: 'tdhp',
        );

  final HitsSearcher _householdSearcher;

  HitsSearcher get householdSearcher => _householdSearcher;

  // Static init method to initialize the singleton with API key and app ID
  static void init(String apiKey, String appId) {
    _instance ??= HouseholdSearcher._internal(apiKey, appId);
  }

  // Singleton instance accessor
  static HouseholdSearcher get instance {
    if (_instance == null) {
      throw Exception(
          "HouseholdSearcher is not initialized. Call init() first.");
    }
    return _instance!;
  }
}
