import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rpc: vi.fn(),
  get: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: mocks.get }) }));
vi.mock('@lib/supabase/server-client', () => ({
  createServerSupabaseClient: async () => ({ auth: { getClaims: mocks.getClaims }, rpc: mocks.rpc }),
}));

describe('server auth bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null });
    mocks.get.mockReturnValue(undefined);
    mocks.rpc.mockImplementation((name: string) => {
      if (name === 'list_my_pagodas') return Promise.resolve({ data: [{ id: 'pagoda-1', slug: 'one', name: 'One' }], error: null });
      return Promise.resolve({ data: true, error: null });
    });
  });

  it('returns only the verified user access needed to hydrate the dashboard', async () => {
    const { loadServerAuthBootstrap } = await import('./server-auth-bootstrap');
    await expect(loadServerAuthBootstrap()).resolves.toEqual({
      kind: 'ready', userId: 'user-1',
      pagodas: [{ id: 'pagoda-1', slug: 'one', name: 'One' }],
      activePagoda: { id: 'pagoda-1', slug: 'one', name: 'One' },
      isLibraryAdmin: true,
    });
  });

  it('does not manufacture access when membership is empty', async () => {
    mocks.rpc.mockImplementation((name: string) => Promise.resolve({ data: name === 'is_admin' ? false : [], error: null }));
    const { loadServerAuthBootstrap } = await import('./server-auth-bootstrap');
    await expect(loadServerAuthBootstrap()).resolves.toEqual({ kind: 'empty-access' });
  });

  it('does not turn provider unavailability into a logout', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null }, error: new Error('offline') });
    const { loadServerAuthBootstrap } = await import('./server-auth-bootstrap');
    await expect(loadServerAuthBootstrap()).resolves.toEqual({ kind: 'error' });
  });
});
