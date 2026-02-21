import 'package:algoliasearch/algoliasearch.dart';
import 'package:ss_lotus/entities/household.dart';
import 'package:ss_lotus/utils/algolia_config.dart';

class HouseholdSearcher {
  final SearchClient _client = SearchClient(
    appId: AlgoliaConfig.appId,
    apiKey: AlgoliaConfig.searchApiKey,
  );

  Future<List<HouseHold>> search(String query) async {
    if (query.trim().isEmpty) return [];

    final response = await _client.searchSingleIndex(
      indexName: AlgoliaConfig.indexName,
      searchParamsObject: SearchParamsObject(
        query: query.trim(),
        hitsPerPage: 100,
      ),
    );

    return response.hits
        .map((hit) => HouseHold.fromJson(hit))
        .toList();
  }
}
