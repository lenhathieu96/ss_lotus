import { describe, expect, it, vi } from 'vitest';
import { createSupabaseAuthSource } from './supabase-auth-source';

describe('Supabase auth source', () => {
  it('maps the remote session to the auth source session contract and cleans up subscriptions', async () => {
    const unsubscribe = vi.fn();
    const listener = vi.fn();
    const onAuthStateChange = vi.fn().mockImplementation((callback) => {
      callback('SIGNED_IN', { user: { id: 'user-1' } });
      return { data: { subscription: { unsubscribe } } };
    });
    const source = createSupabaseAuthSource({
      client: { auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }),
        onAuthStateChange,
        signOut: vi.fn().mockResolvedValue({ error: null }),
      } } as never,
      configurationError: null,
    });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'secret' })).resolves.toBe(true);
    await expect(source.getSession()).resolves.toEqual({ userId: 'user-1' });
    const stop = source.subscribeToSession(listener);
    stop();

    expect(listener).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('does not attempt network auth when the browser source is unconfigured', async () => {
    const source = createSupabaseAuthSource({ client: null, configurationError: 'Missing configuration' });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'secret' })).resolves.toBe(false);
    await expect(source.getSession()).resolves.toBeNull();
    expect(source.configurationError).toBe('Missing configuration');
  });

  it('maps remote sign-in failures to an unsuccessful auth result', async () => {
    const source = createSupabaseAuthSource({
      client: { auth: { signInWithPassword: vi.fn().mockResolvedValue({ error: new Error('Invalid credentials') }) } } as never,
      configurationError: null,
    });

    await expect(source.signIn({ email: 'admin@ss-lotus.local', password: 'wrong' })).resolves.toBe(false);
  });
});
