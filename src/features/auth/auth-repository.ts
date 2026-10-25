import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseConfigurationError } from '@data/network/supabase/browser-client';

const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function usernameToAuthEmail(username: string): string | null {
  const normalizedUsername = username.trim().toLowerCase();
  if (!usernamePattern.test(normalizedUsername)) return null;
  return `${normalizedUsername}@ss-lotus.local`;
}

export type AuthCredentials = Readonly<{ email: string; password: string }>;
export type AuthSession = Readonly<{ userId: string }>;
export type AuthSessionListener = (session: AuthSession | null) => void;

/** Stable browser-auth contract for auth presentation. */
export interface AuthRepository {
  readonly configurationError: string | null;
  signIn(credentials: AuthCredentials): Promise<boolean>;
  getSession(): Promise<AuthSession | null>;
  subscribeToSession(listener: AuthSessionListener): () => void;
  signOut(): Promise<void>;
}

export function createAuthRepository(
  config: { client: SupabaseClient | null; configurationError: string | null } = {
    client: supabase,
    configurationError: supabaseConfigurationError,
  },
): AuthRepository {
  const toSession = (session: Session | null): AuthSession | null => (
    session ? { userId: session.user.id } : null
  );

  return {
    configurationError: config.configurationError,
    async signIn(credentials) {
      if (!config.client) return false;
      const { error } = await config.client.auth.signInWithPassword(credentials);
      return !error;
    },
    async getSession() {
      if (!config.client) return null;
      const {
        data: { session },
      } = await config.client.auth.getSession();
      return toSession(session);
    },
    subscribeToSession(listener) {
      if (!config.client) return () => undefined;
      const {
        data: { subscription },
      } = config.client.auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => subscription.unsubscribe();
    },
    async signOut() {
      if (!config.client) return;
      const { error } = await config.client.auth.signOut();
      if (error) throw error;
    },
  };
}

export const authRepository = createAuthRepository();
