type ProviderError = Readonly<{ code?: unknown; status?: unknown; message?: unknown }>;

function providerError(value: unknown): ProviderError | null {
  return value && typeof value === 'object' ? value as ProviderError : null;
}

/**
 * Only classify responses that prove the browser session is no longer valid.
 * Transport errors deliberately remain retryable and must not clear client state.
 */
export function isAuthenticationFailure(error: unknown): boolean {
  const candidate = providerError(error);
  if (!candidate) return false;
  if (candidate.status === 401) return true;
  return typeof candidate.code === 'string' && [
    'bad_jwt',
    'invalid_jwt',
    'jwt_expired',
    'refresh_token_not_found',
    'session_not_found',
    // PostgREST surfaces JWT validation failures as a code, not an HTTP status
    // on Supabase RPC error objects.
    'PGRST301',
    'PGRST302',
  ].includes(candidate.code);
}

/** A confirmed authorization denial, distinct from an unavailable provider. */
export function isPermissionFailure(error: unknown): boolean {
  const candidate = providerError(error);
  return candidate?.status === 403 || candidate?.code === '42501';
}
