import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc },
  supabaseConfigurationError: null,
}));

import { isLibraryAdmin } from './library-repository';

describe('isLibraryAdmin', () => {
  beforeEach(() => rpc.mockReset());

  it('uses the established admin RPC and recognizes administrators', async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(isLibraryAdmin()).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('is_admin');
  });

  it('keeps non-admin sessions denied', async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(isLibraryAdmin()).resolves.toBe(false);
  });
});
