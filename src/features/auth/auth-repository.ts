import { createSupabaseAuthSource } from './data/network/supabase-auth-source';
import type { AuthCredentials, AuthNetworkSource, AuthSession, AuthSessionListener } from './data/network/interface';

/** Stable browser-auth contract for auth presentation. */
export interface AuthRepository {
  readonly configurationError: string | null;
  signIn(credentials: AuthCredentials): Promise<boolean>;
  getSession(): Promise<AuthSession | null>;
  subscribeToSession(listener: AuthSessionListener): () => void;
  signOut(): Promise<void>;
}

export function createAuthRepository(network: AuthNetworkSource = createSupabaseAuthSource()): AuthRepository {
  return {
    configurationError: network.configurationError,
    signIn: (credentials) => network.signIn(credentials),
    getSession: () => network.getSession(),
    subscribeToSession: (listener) => network.subscribeToSession(listener),
    signOut: () => network.signOut(),
  };
}

export const authRepository = createAuthRepository();
