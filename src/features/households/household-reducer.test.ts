import { describe, expect, it } from 'vitest';
import { createDraftHousehold, householdReducer } from './household-reducer';

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
