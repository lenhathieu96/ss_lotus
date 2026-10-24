import { supabase, supabaseConfigurationError } from '@/data/remote/supabase/browser-client';
import type { LibraryBrowserNetworkConfig } from './interface';

/** Provides browser-only dependencies without storing credentials locally. */
export function createLibraryBrowserNetworkConfig(): LibraryBrowserNetworkConfig {
  return {
    async getAccessToken(): Promise<string> {
      if (!supabase) throw new Error(supabaseConfigurationError ?? 'Thiếu cấu hình Supabase.');
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return data.session.access_token;
    },
    send(path: string, init: RequestInit): Promise<Response> {
      return fetch(path, init);
    },
  };
}
