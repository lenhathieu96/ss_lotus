import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

import { getHouseholdWorkspace } from './household-repository';

describe('household repository', () => {
  beforeEach(() => rpc.mockReset());

  it('maps the nested yearless death-date object from the workspace RPC', async () => {
    rpc.mockResolvedValue({ data: { id: 'household-1', businessNumber: 12, families: [{ id: 'family-1', businessNumber: 7, address: 'Địa chỉ A', members: [], deceasedPeople: [{ id: 'spirit-1', code: 'HL-01', fullName: 'HƯƠNG LINH A', dateOfDeath: { day: 1, month: 2, isLeap: true }, prayerHistory: [] }] }] }, error: null });

    await expect(getHouseholdWorkspace('household-1')).resolves.toMatchObject({ families: [{ deceasedPeople: [{ dateOfDeath: { day: 1, month: 2, isLeap: true } }] }] });
    expect(rpc).toHaveBeenCalledWith('get_household_workspace', { p_household_id: 'household-1' });
  });
});
