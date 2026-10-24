import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@data/network/supabase/browser-client', () => ({ supabase: { rpc } }));

import { ceremonyPeriodLabels, createHouseholdWellbeingRegistration, createMemorialRegistration } from './prayer-repository';

describe('prayer repository', () => {
  beforeEach(() => rpc.mockReset());

  it('provides labels for every persisted ceremony period', () => {
    expect(ceremonyPeriodLabels).toEqual({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' });
  });

  it('sends the selected household members and ceremony slot to the wellbeing RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await createHouseholdWellbeingRegistration('household-1', ['member-1', 'member-2'], '2026-02-17', 'afternoon');

    expect(rpc).toHaveBeenCalledWith('create_household_wellbeing_registration', {
      p_household_id: 'household-1',
      p_member_ids: ['member-1', 'member-2'],
      p_ceremony_date: '2026-02-17',
      p_period: 'afternoon',
    });
  });

  it('rejects an empty wellbeing selection before it calls Supabase', async () => {
    await expect(createHouseholdWellbeingRegistration('household-1', [], '2026-02-17', 'morning')).rejects.toThrow('Chọn ít nhất một thành viên');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('maps provider capacity failures and keeps memorial registration payloads year-aware', async () => {
    rpc.mockResolvedValueOnce({ error: { message: 'slot is full' } });
    await expect(createHouseholdWellbeingRegistration('household-1', ['member-1'], '2026-02-17', 'morning')).rejects.toThrow('đủ số lượng');

    rpc.mockResolvedValueOnce({ error: null });
    await createMemorialRegistration('deceased-1', '2026-02-17', 'evening');
    expect(rpc).toHaveBeenLastCalledWith('create_memorial_registration', {
      p_deceased_person_id: 'deceased-1',
      p_ceremony_date: '2026-02-17',
      p_period: 'evening',
    });
  });
});
