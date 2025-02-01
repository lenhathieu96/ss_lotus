import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/utils/searcher.dart';

part 'search_households_dialog_provider.g.dart';

@riverpod
class SearchHouseHolds extends _$SearchHouseHolds {
  final _householdSearcher = HouseholdSearcher.instance.householdSearcher;

  @override
  List<HouseHold> build() {
    return [];
  }

  Future<void> searchHouseHolds(String text) async {
    if (text.isEmpty) {
      state = []; // Clear the list when search text is empty
    } else {
      _householdSearcher.query(text);
      final response = await _householdSearcher.responses.first;
      state = response.hits.map(HouseHold.fromHit).toList();
    }
  }
}
