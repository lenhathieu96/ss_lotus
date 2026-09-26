const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function usernameToAuthEmail(username: string): string | null {
  const normalizedUsername = username.trim().toLowerCase();
  if (!usernamePattern.test(normalizedUsername)) return null;
  return `${normalizedUsername}@ss-lotus.local`;
}
