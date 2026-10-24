/**
 * Reserved boundary for future auth-adjacent local state. Authentication
 * sessions remain managed by the configured browser auth provider.
 */
export const authLocalSourceConfig = {
  sourceName: 'auth-local',
  version: 1,
} as const;
