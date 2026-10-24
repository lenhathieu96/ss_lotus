import { describe, expect, it, vi } from 'vitest';
import { createAuthRepository } from './auth-repository';
import type { AuthNetworkSource } from '@/data/auth/network/interface';

describe('auth repository', () => {
  it('keeps presentation on the stable auth contract while delegating to its network source', async () => {
    const source: AuthNetworkSource = {
      configurationError: null,
      signIn: vi.fn().mockResolvedValue(true),
      getSession: vi.fn().mockResolvedValue({ userId: 'user-1' }),
      subscribeToSession: vi.fn().mockReturnValue(() => undefined),
      signOut: vi.fn().mockResolvedValue(undefined),
    };
    const repository = createAuthRepository(source);

    await expect(repository.signIn({ email: 'admin@ss-lotus.local', password: 'secret' })).resolves.toBe(true);
    await expect(repository.getSession()).resolves.toEqual({ userId: 'user-1' });
    await repository.signOut();

    expect(source.signIn).toHaveBeenCalledWith({ email: 'admin@ss-lotus.local', password: 'secret' });
    expect(source.getSession).toHaveBeenCalledOnce();
    expect(source.signOut).toHaveBeenCalledOnce();
  });
});
