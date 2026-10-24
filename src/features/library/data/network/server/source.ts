import 'server-only';

import { libraryS3LifecycleSource } from './library-s3-lifecycle-source';
import type { LibraryServerLifecycleSource } from './interface';

/** The sole composition point for the default server lifecycle adapter. */
export function getLibraryServerLifecycleSource(): LibraryServerLifecycleSource {
  return libraryS3LifecycleSource;
}
