import { supabase, supabaseConfigurationError } from '@/lib/supabase';

/** Browser-only client configuration for the current remote auth source. */
export const authNetworkConfig = {
  client: supabase,
  configurationError: supabaseConfigurationError,
} as const;
