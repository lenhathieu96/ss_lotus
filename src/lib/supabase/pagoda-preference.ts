const ACTIVE_PAGODA_PREFERENCE_PREFIX = 'ss-lotus.active-pagoda-id';

export function activePagodaPreferenceKey(userId: string): string {
  return `${ACTIVE_PAGODA_PREFERENCE_PREFIX}.${userId}`;
}

export const activePagodaPreferenceOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
};

export function activePagodaPreferenceValue(cookieValue: string | undefined): string | null {
  if (!cookieValue || cookieValue.length > 200 || /[\u0000-\u001f]/.test(cookieValue)) return null;
  return cookieValue;
}
