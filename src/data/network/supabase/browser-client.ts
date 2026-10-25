import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAuthCookieOptions } from '@lib/supabase/auth-cookie-options';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurationError = !url || !publishableKey
  ? 'Thiếu cấu hình Supabase. Sao chép .env.example thành .env.local rồi điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  : null;

let browserClient: SupabaseClient | null | undefined;

/**
 * Keeps the browser RPC and Function client on the same cookie-backed session
 * that Server Components and the proxy use.
 */
export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (supabaseConfigurationError) return null;
  if (browserClient) return browserClient;

  browserClient = createBrowserClient(url!, publishableKey!, {
    auth: { persistSession: true, autoRefreshToken: true },
    cookieOptions: supabaseAuthCookieOptions,
  });
  return browserClient;
}

export const supabase = createBrowserSupabaseClient();
