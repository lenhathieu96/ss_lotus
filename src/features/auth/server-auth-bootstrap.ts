import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@lib/supabase/server-client';
import { activePagodaPreferenceKey, activePagodaPreferenceValue } from '@lib/supabase/pagoda-preference';
import { isAuthenticationFailure, isPermissionFailure } from '@lib/supabase/auth-errors';
import type { PagodaAccess } from '@features/pagodas/pagoda-client';

export type ReadyAuthBootstrap = Readonly<{
  kind: 'ready';
  userId: string;
  username: string;
  pagodas: PagodaAccess[];
  activePagoda: PagodaAccess;
  isLibraryAdmin: boolean;
}>;

export type ServerAuthBootstrap = ReadyAuthBootstrap
  | Readonly<{ kind: 'unauthenticated' }>
  | Readonly<{ kind: 'empty-access' }>
  | Readonly<{ kind: 'error' }>;

function selectActivePagoda(pagodas: PagodaAccess[], preferredId: string | null): PagodaAccess | null {
  return pagodas.find((pagoda) => pagoda.id === preferredId) ?? pagodas[0] ?? null;
}

function usernameFromClaims(claims: Record<string, unknown>): string {
  const email = claims.email;
  if (typeof email !== 'string') return 'Tài khoản';
  return email.split('@', 1)[0] || 'Tài khoản';
}

/**
 * React cache scopes this work to one server render request.  Do not replace it
 * with a process-wide cache: membership and administrator access are user data.
 */
export const loadServerAuthBootstrap = cache(async (): Promise<ServerAuthBootstrap> => {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError) return isAuthenticationFailure(claimsError) ? { kind: 'unauthenticated' } : { kind: 'error' };
  if (typeof claims?.sub !== 'string') return { kind: 'unauthenticated' };

  const userId = claims.sub;
  const [{ data: pagodasData, error: pagodasError }, { data: adminData, error: adminError }] = await Promise.all([
    supabase.rpc('list_my_pagodas'),
    supabase.rpc('is_admin'),
  ]);

  if (pagodasError) {
    if (isAuthenticationFailure(pagodasError)) return { kind: 'unauthenticated' };
    if (isPermissionFailure(pagodasError)) return { kind: 'empty-access' };
    return { kind: 'error' };
  }
  if (adminError) {
    if (isAuthenticationFailure(adminError)) return { kind: 'unauthenticated' };
    if (isPermissionFailure(adminError)) return { kind: 'empty-access' };
    return { kind: 'error' };
  }

  const pagodas = (pagodasData ?? []) as PagodaAccess[];
  const cookieStore = await cookies();
  const preferredId = activePagodaPreferenceValue(cookieStore.get(activePagodaPreferenceKey(userId))?.value);
  const activePagoda = selectActivePagoda(pagodas, preferredId);
  if (!activePagoda) return { kind: 'empty-access' };

  return { kind: 'ready', userId, username: usernameFromClaims(claims), pagodas, activePagoda, isLibraryAdmin: adminData === true };
});
