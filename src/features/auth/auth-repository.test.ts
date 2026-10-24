import { describe, expect, it, vi } from 'vitest';
import { createAuthRepository, usernameToAuthEmail } from './auth-repository';

describe('auth repository', () => {
  it('maps the remote session to the auth source session contract and cleans up subscriptions', async () => {
    const unsubscribe = vi.fn();
    const listener = vi.fn();
    const onAuthStateChange = vi.fn().mockImplementation((callback) => {
      callback('SIGNED_IN', { user: { id: 'user-1' } });
      return { data: { subscription: { unsubscribe } } };
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const source = createAuthRepository({
      client: { auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
        onAuthStateChange,
        signOut,
      } } as never,
      configurationError: null,
    });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'secret' })).resolves.toBe(true);
    await expect(source.getSession()).resolves.toEqual({ userId: 'user-1' });
    const stop = source.subscribeToSession(listener);
    stop();

    expect(listener).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(unsubscribe).toHaveBeenCalledOnce();
    await source.signOut();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('does not attempt network auth when the browser source is unconfigured', async () => {
    const source = createAuthRepository({ client: null, configurationError: 'Missing configuration' });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'secret' })).resolves.toBe(false);
    await expect(source.getSession()).resolves.toBeNull();
    expect(source.configurationError).toBe('Missing configuration');
    expect(() => source.subscribeToSession(vi.fn())()).not.toThrow();
    await expect(source.signOut()).resolves.toBeUndefined();
  });

  it('maps remote sign-in failures to an unsuccessful auth result', async () => {
    const source = createAuthRepository({
      client: { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('Invalid credentials') }) } } as never,
      configurationError: null,
    });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'wrong' })).resolves.toBe(false);
  });
});

describe('usernameToAuthEmail', () => {
  it('normalizes a username into the internal Supabase Auth email alias', () => {
    expect(usernameToAuthEmail(' Admin ')).toBe('admin@ss-lotus.local');
  });

  it('rejects a username that cannot safely become an email alias', () => {
    expect(usernameToAuthEmail('a@b')).toBeNull();
    expect(usernameToAuthEmail('ab')).toBeNull();
  });
});
