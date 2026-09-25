import { Family, Household, HouseholdEditorState, Member, hasEmptyFamily, normalizeUppercase } from './household-domain';

type HouseholdAction =
  | { type: 'family-added'; address: string }
  | { type: 'member-added'; familyId: string; member: Member }
  | { type: 'members-reordered'; familyId: string; fromIndex: number; toIndex: number }
  | { type: 'member-moved'; memberId: string; fromFamilyId: string; toFamilyId: string; toIndex: number }
  | { type: 'family-address-updated'; familyId: string; address: string }
  | { type: 'member-removed'; familyId: string; memberId: string }
  | { type: 'saved'; household?: Household }
  | { type: 'cleared' };

export function createDraftHousehold(): HouseholdEditorState {
  return { household: null, isDirty: false, canSave: false, canPrint: false };
}

function withDraft(household: Household): HouseholdEditorState {
  const isSaveable = household.families.length > 0 && !hasEmptyFamily(household);
  return { household, isDirty: true, canSave: isSaveable, canPrint: false };
}

function createFamily(address: string, index: number): Family {
  return { id: `family-${index + 1}`, address: normalizeUppercase(address), members: [] };
}

export function householdReducer(state: HouseholdEditorState, action: HouseholdAction): HouseholdEditorState {
  if (action.type === 'cleared') return createDraftHousehold();
  if (action.type === 'saved') {
    return state.household && !hasEmptyFamily(state.household)
      ? { household: action.household ?? state.household, isDirty: false, canSave: false, canPrint: true }
      : state;
  }

  if (action.type === 'family-added') {
    const household = state.household ?? { id: 'draft-household', families: [] };
    return withDraft({ ...household, families: [...household.families, createFamily(action.address, household.families.length)] });
  }
  if (!state.household) return state;

  if (action.type === 'member-added') {
    const member = { ...action.member, fullName: normalizeUppercase(action.member.fullName), dharmaName: action.member.dharmaName && normalizeUppercase(action.member.dharmaName) };
    return withDraft({ ...state.household, families: state.household.families.map((family) => family.id === action.familyId ? { ...family, members: [...family.members, member] } : family) });
  }
  if (action.type === 'members-reordered') {
    return withDraft({ ...state.household, families: state.household.families.map((family) => {
      if (family.id !== action.familyId) return family;
      const members = [...family.members];
      const [member] = members.splice(action.fromIndex, 1);
      if (!member) return family;
      members.splice(action.toIndex, 0, member);
      return { ...family, members };
    }) });
  }
  if (action.type === 'family-address-updated') {
    return withDraft({ ...state.household, families: state.household.families.map((family) => family.id === action.familyId ? { ...family, address: normalizeUppercase(action.address) } : family) });
  }
  if (action.type === 'member-removed') {
    return withDraft({ ...state.household, families: state.household.families.map((family) => family.id === action.familyId ? { ...family, members: family.members.filter((member) => member.id !== action.memberId) } : family) });
  }
  const source = state.household.families.find((family) => family.id === action.fromFamilyId);
  if (!source) return state;
  const member = source.members.find((candidate) => candidate.id === action.memberId);
  if (!member) return state;
  const withoutSource = state.household.families.map((family) => family.id === source.id ? { ...family, members: family.members.filter((candidate) => candidate.id !== member.id) } : family);
  return withDraft({ ...state.household, families: withoutSource.map((family) => {
    if (family.id !== action.toFamilyId) return family;
    const members = [...family.members];
    members.splice(Math.min(action.toIndex, members.length), 0, member);
    return { ...family, members };
  }) });
}
