import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { authNetworkConfig } from './config';
import type { AuthCredentials, AuthNetworkSource, AuthSession } from './interface';

type SupabaseAuthNetworkConfig = Readonly<{
  client: SupabaseClient | null;
  configurationError: string | null;
}>;

function toAuthSession(session: Session | null): AuthSession | null {
  return session ? { userId: session.user.id } : null;
}

export function createSupabaseAuthSource(config: SupabaseAuthNetworkConfig = authNetworkConfig): AuthNetworkSource {
  return {
    configurationError: config.configurationError,
    async signIn({ email, password }: AuthCredentials): Promise<boolean> {
      if (!config.client) return false;
      const { error } = await config.client.auth.signInWithPassword({ email, password });
      return !error;
    },
    async getSession(): Promise<AuthSession | null> {
      if (!config.client) return null;
      const { data: { session } } = await config.client.auth.getSession();
      return toAuthSession(session);
    },
    subscribeToSession(listener) {
      if (!config.client) return () => undefined;
      const { data: { subscription } } = config.client.auth.onAuthStateChange((_event, session) => {
        listener(toAuthSession(session));
      });
      return () => subscription.unsubscribe();
    },
    async signOut(): Promise<void> {
      if (!config.client) return;
      await config.client.auth.signOut();
    },
  };
}
