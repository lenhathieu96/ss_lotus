import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/utils/searcher.dart';

part 'search_households_dialog_provider.g.dart';

@riverpod
class SearchHouseHolds extends _$SearchHouseHolds {
  final _searcher = HouseholdSearcher();

  @override
  List<HouseHold> build() {
    return [];
  }

  Future<void> searchHouseHolds(String text) async {
    if (text.isEmpty) {
      state = [];
    } else {
      state = await _searcher.search(text);
    }
  }
}
