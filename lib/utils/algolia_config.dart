class AlgoliaConfig {
  static const String appId =
      String.fromEnvironment('ALGOLIA_APP_ID');
  static const String searchApiKey =
      String.fromEnvironment('ALGOLIA_SEARCH_API_KEY');
  static const String indexName =
      String.fromEnvironment('ALGOLIA_INDEX_NAME');
}
