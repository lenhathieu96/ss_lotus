import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAuthCookieOptions } from './auth-cookie-options';

type ReadonlyCookieStore = Pick<Awaited<ReturnType<typeof cookies>>, 'getAll'>;

function supabaseConfiguration(): [string, string] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Missing Supabase browser configuration.');
  return [url, publishableKey];
}

/**
 * Creates a request-scoped, read-only client for Server Components. Session
 * refresh writes belong to the proxy, which runs before RSC rendering.
 */
export async function createServerSupabaseClient(cookieStore?: ReadonlyCookieStore) {
  const [url, publishableKey] = supabaseConfiguration();
  const requestCookies = cookieStore ?? await cookies();
  return createServerClient(url, publishableKey, {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll: () => requestCookies.getAll(),
    },
  });
}

export async function createServerSupabaseClientFromRequest() {
  return createServerSupabaseClient();
}
