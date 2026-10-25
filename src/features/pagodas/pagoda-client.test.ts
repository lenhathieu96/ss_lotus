import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@data/network/supabase/browser-client', () => ({ supabase: { rpc } }));

import {
  activePagodaId,
  activePagodaStorageKey,
  clearActivePagodaId,
  listMyPagodas,
  setActivePagodaId,
  setActivePagodaMemory,
  storedActivePagodaId,
} from './pagoda-client';

describe('pagoda client access state', () => {
  beforeEach(() => {
    clearActivePagodaId();
    localStorage.clear();
    rpc.mockReset();
  });

  it('keeps the active pagoda in memory while persisting a user-scoped cookie preference', () => {
    setActivePagodaId('user-a', 'pagoda-a');

    expect(activePagodaId()).toBe('pagoda-a');
    expect(storedActivePagodaId('user-a')).toBe('pagoda-a');
    expect(storedActivePagodaId('user-b')).toBeNull();
    expect(activePagodaStorageKey('user-a')).not.toBe(activePagodaStorageKey('user-b'));
    expect(document.cookie).toContain('ss-lotus.active-pagoda-id.user-a=pagoda-a');

    clearActivePagodaId();
    expect(() => activePagodaId()).toThrow('Hãy chọn chùa đang quản trị.');
    expect(storedActivePagodaId('user-a')).toBe('pagoda-a');

    setActivePagodaMemory('user-b', 'pagoda-b');
    expect(activePagodaId()).toBe('pagoda-b');
  });

  it('uses the role-free access-list contract and preserves Supabase errors', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'pagoda-a', slug: 'an-lac', name: 'Chùa An Lạc' }], error: null });

    await expect(listMyPagodas()).resolves.toEqual([{ id: 'pagoda-a', slug: 'an-lac', name: 'Chùa An Lạc' }]);
    expect(rpc).toHaveBeenCalledWith('list_my_pagodas');

    rpc.mockResolvedValue({ data: null, error: { message: 'Không được phép truy cập' } });
    await expect(listMyPagodas()).rejects.toThrow('Không được phép truy cập');
  });

  it('removes the user-scoped preference without affecting another account', async () => {
    setActivePagodaId('user-a', 'pagoda-a');
    setActivePagodaId('user-b', 'pagoda-b');
    const { removeStoredActivePagodaId } = await import('./pagoda-client');
    removeStoredActivePagodaId('user-a');
    expect(storedActivePagodaId('user-a')).toBeNull();
    expect(storedActivePagodaId('user-b')).toBe('pagoda-b');
  });
});
