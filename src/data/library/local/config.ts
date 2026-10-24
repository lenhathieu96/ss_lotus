/**
 * Local library storage is intentionally disabled for this first migration.
 * Keeping the policy next to the reserved local contract makes a later cache
 * implementation an explicit feature decision rather than a UI concern.
 */
export const libraryLocalDataSourceConfig = {
  persistence: 'disabled',
} as const;
