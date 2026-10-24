import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@data/network/supabase/browser-client', () => ({ supabase: { rpc } }));

import { createDraftHousehold, getHouseholdWorkspace, householdReducer } from './household-repository';

describe('household repository', () => {
  beforeEach(() => rpc.mockReset());

  it('maps the nested yearless death-date object from the workspace RPC', async () => {
    rpc.mockResolvedValue({ data: { id: 'household-1', businessNumber: 12, families: [{ id: 'family-1', businessNumber: 7, address: 'Địa chỉ A', members: [], deceasedPeople: [{ id: 'spirit-1', code: 'HL-01', fullName: 'HƯƠNG LINH A', dateOfDeath: { day: 1, month: 2, isLeap: true }, prayerHistory: [] }] }] }, error: null });

    await expect(getHouseholdWorkspace('household-1')).resolves.toMatchObject({ families: [{ deceasedPeople: [{ dateOfDeath: { day: 1, month: 2, isLeap: true } }] }] });
    expect(rpc).toHaveBeenCalledWith('get_household_workspace', { p_household_id: 'household-1' });
  });
});

describe('householdReducer', () => {
  it('marks edits as unsaved and blocks saving when a family has no members', () => {
    const state = createDraftHousehold();
    const edited = householdReducer(state, { type: 'family-added', address: '12 LÊ LỢI' });

    expect(edited.isDirty).toBe(true);
    expect(edited.canSave).toBe(false);
    expect(edited.canPrint).toBe(false);
  });

  it('moves a member between families without losing order', () => {
    const state = householdReducer(
      householdReducer(
        householdReducer(createDraftHousehold(), { type: 'family-added', address: '12 LÊ LỢI' }),
        { type: 'member-added', familyId: 'family-1', member: { id: 'm-1', fullName: 'NGUYỄN VĂN AN' } },
      ),
      { type: 'family-added', address: '24 TRẦN PHÚ' },
    );
    const moved = householdReducer(state, {
      type: 'member-moved', memberId: 'm-1', fromFamilyId: 'family-1', toFamilyId: 'family-2', toIndex: 0,
    });

    expect(moved.household?.families[0].members).toEqual([]);
    expect(moved.household?.families[1].members.map((member) => member.fullName)).toEqual(['NGUYỄN VĂN AN']);
  });

  it('reorders members within the same family', () => {
    const withMembers = householdReducer(
      householdReducer(
        householdReducer(createDraftHousehold(), { type: 'family-added', address: '12 LÊ LỢI' }),
        { type: 'member-added', familyId: 'family-1', member: { id: 'm-1', fullName: 'NGUYỄN VĂN AN' } },
      ),
      { type: 'member-added', familyId: 'family-1', member: { id: 'm-2', fullName: 'TRẦN THỊ BÌNH' } },
    );

    const reordered = householdReducer(withMembers, { type: 'members-reordered', familyId: 'family-1', fromIndex: 1, toIndex: 0 });

    expect(reordered.household?.families[0].members.map((member) => member.id)).toEqual(['m-2', 'm-1']);
  });
});
