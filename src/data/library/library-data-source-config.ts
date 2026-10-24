/** Browser-visible configuration for the library's published PDF location. */
export type LibraryDataSourceConfig = Readonly<{
  publicDocumentBaseUrl?: string;
}>;

/**
 * Reads only public build-time configuration. Library upload state remains on
 * the server; this module intentionally has no browser persistence.
 */
export function getLibraryDataSourceConfig(): LibraryDataSourceConfig {
  return { publicDocumentBaseUrl: process.env.NEXT_PUBLIC_S3_LIBRARY_BASE_URL };
}
