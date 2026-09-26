import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurationError = !url || !publishableKey
  ? 'Thiếu cấu hình Supabase. Sao chép .env.example thành .env.local rồi điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
  : null;

export const supabase: SupabaseClient | null = supabaseConfigurationError
  ? null
  : createClient(url!, publishableKey!, { auth: { persistSession: true, autoRefreshToken: true } });
