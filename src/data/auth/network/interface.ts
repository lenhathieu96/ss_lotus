export type AuthCredentials = Readonly<{
  email: string;
  password: string;
}>;

export type AuthSession = Readonly<{
  userId: string;
}>;

export type AuthSessionListener = (session: AuthSession | null) => void;

export interface AuthNetworkSource {
  readonly configurationError: string | null;
  signIn(credentials: AuthCredentials): Promise<boolean>;
  getSession(): Promise<AuthSession | null>;
  subscribeToSession(listener: AuthSessionListener): () => void;
  signOut(): Promise<void>;
}
