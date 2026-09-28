const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function usernameToAuthEmail(username: string): string | null {
  const normalizedUsername = username.trim().toLowerCase();
  if (!usernamePattern.test(normalizedUsername)) return null;
  return `${normalizedUsername}@ss-lotus.local`;
}

/** Accept a real email address while retaining legacy username aliases. */
export function loginIdentifierToAuthEmail(identifier: string): string | null {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (emailPattern.test(normalizedIdentifier)) return normalizedIdentifier;
  return usernameToAuthEmail(normalizedIdentifier);
}
