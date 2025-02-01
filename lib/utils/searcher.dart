import 'package:algolia_helper_flutter/algolia_helper_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class HitsSearcherSingleton {
  static final HitsSearcherSingleton _instance =
      HitsSearcherSingleton._internal();

  factory HitsSearcherSingleton() {
    return _instance;
  }

  HitsSearcherSingleton._internal()
      : _householdSearcher = HitsSearcher(
          applicationID: dotenv.env['ALGOLIA_APP_ID'] ?? "",
          apiKey: dotenv.env['ALGOLIA_API_KEY'] ?? "",
          indexName: 'tdhp',
        );

  final HitsSearcher _householdSearcher;

  HitsSearcher get householdSearcher => _householdSearcher;
}
