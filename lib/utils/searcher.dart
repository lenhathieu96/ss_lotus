import 'package:algolia_helper_flutter/algolia_helper_flutter.dart';

class HitsSearcherSingleton {
  static final HitsSearcherSingleton _instance =
      HitsSearcherSingleton._internal();

  factory HitsSearcherSingleton() {
    return _instance;
  }

  HitsSearcherSingleton._internal()
      : _householdSearcher = HitsSearcher(
          debounce: Duration(seconds: 1),
          applicationID: 'TMHHDJJ8E0',
          apiKey: '12c2ef492e2549bac78756caaf90f6fd',
          indexName: 'tdhp',
        );

  final HitsSearcher _householdSearcher;

  HitsSearcher get householdSearcher => _householdSearcher;
}
