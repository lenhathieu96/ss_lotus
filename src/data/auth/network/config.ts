import { supabase, supabaseConfigurationError } from '@/data/remote/supabase/browser-client';

/** Browser-only client configuration for the current remote auth source. */
export const authNetworkConfig = {
  client: supabase,
  configurationError: supabaseConfigurationError,
} as const;
