import { supabase } from '@data/network/supabase/browser-client';
import { type LunarDayMonth, isValidLunarDayMonth } from '@features/calendar/lunar-date-domain';
import { activePagodaId } from '@features/pagodas/pagoda-client';

export type PrayerType = 'wellbeing' | 'memorial';
export type CeremonyPeriod = 'morning' | 'afternoon' | 'evening';

export interface Member {
  id: string;
  fullName: string;
  dharmaName?: string;
  yearOfBirth?: number;
  prayerHistory?: PrayerHistory[];
}

export interface PrayerHistory {
  date: string;
  period: CeremonyPeriod;
}

export interface HouseholdDeceasedPerson {
  id: string;
  code: string;
  fullName: string;
  dharmaName?: string | null;
  dateOfDeath: LunarDayMonth;
  prayerHistory: PrayerHistory[];
}

export interface Family {
  id: string;
  businessNumber?: number;
  address: string;
  members: Member[];
  deceasedPeople?: HouseholdDeceasedPerson[];
}

export interface Household {
  id: string;
  businessNumber?: number;
  oldNumber?: number;
  families: Family[];
}

export interface HouseholdEditorState {
  household: Household | null;
  isDirty: boolean;
  canSave: boolean;
  canPrint: boolean;
}

export interface SavedHouseholdResult {
  household: Household;
}

export function normalizeUppercase(value: string): string {
  return value.trim().toLocaleUpperCase('vi-VN');
}

export function hasEmptyFamily(household: Household | null): boolean {
  return household?.families.some((family) => family.members.length === 0) ?? false;
}

export function allowedPeriods(type: PrayerType): CeremonyPeriod[] {
  return ['morning', 'afternoon', 'evening'];
}

export function isFutureOrToday(date: Date, today = new Date()): boolean {
  const candidate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return candidate >= startOfToday;
}

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
    return withDraft({
      ...household,
      families: [
        ...household.families,
        createFamily(action.address, household.families.length),
      ],
    });
  }
  if (!state.household) return state;

  if (action.type === 'member-added') {
    const member = {
      ...action.member,
      fullName: normalizeUppercase(action.member.fullName),
      dharmaName: action.member.dharmaName && normalizeUppercase(action.member.dharmaName),
    };
    const families = state.household.families.map((family) => (
      family.id === action.familyId
        ? { ...family, members: [...family.members, member] }
        : family
    ));
    return withDraft({ ...state.household, families });
  }

  if (action.type === 'members-reordered') {
    const families = state.household.families.map((family) => {
      if (family.id !== action.familyId) return family;

      const members = [...family.members];
      const [member] = members.splice(action.fromIndex, 1);
      if (!member) return family;

      members.splice(action.toIndex, 0, member);
      return { ...family, members };
    });
    return withDraft({ ...state.household, families });
  }

  if (action.type === 'family-address-updated') {
    const families = state.household.families.map((family) => (
      family.id === action.familyId
        ? { ...family, address: normalizeUppercase(action.address) }
        : family
    ));
    return withDraft({ ...state.household, families });
  }

  if (action.type === 'member-removed') {
    const families = state.household.families.map((family) => (
      family.id === action.familyId
        ? { ...family, members: family.members.filter((member) => member.id !== action.memberId) }
        : family
    ));
    return withDraft({ ...state.household, families });
  }

  const source = state.household.families.find((family) => family.id === action.fromFamilyId);
  if (!source) return state;

  const member = source.members.find((candidate) => candidate.id === action.memberId);
  if (!member) return state;

  const withoutSource = state.household.families.map((family) => (
    family.id === source.id
      ? { ...family, members: family.members.filter((candidate) => candidate.id !== member.id) }
      : family
  ));
  const families = withoutSource.map((family) => {
    if (family.id !== action.toFamilyId) return family;

    const members = [...family.members];
    members.splice(Math.min(action.toIndex, members.length), 0, member);
    return { ...family, members };
  });
  return withDraft({ ...state.household, families });
}

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

type RpcMember = {
  id: string;
  fullName: string;
  dharmaName?: string | null;
  yearOfBirth?: number | null;
  prayerHistory?: PrayerHistory[];
};
type RpcDeceasedPerson = {
  id: string;
  code: string;
  fullName: string;
  dharmaName?: string | null;
  dateOfDeath: LunarDayMonth;
  prayerHistory?: PrayerHistory[];
};
type RpcFamily = {
  id: string;
  businessNumber: number;
  address: string;
  members: RpcMember[];
  deceasedPeople?: RpcDeceasedPerson[];
};
type RpcHousehold = {
  id: string;
  businessNumber: number;
  legacyNumber?: number | null;
  families: RpcFamily[];
};

function mapMember(member: RpcMember): Member {
  return {
    id: member.id,
    fullName: member.fullName,
    ...(member.dharmaName ? { dharmaName: member.dharmaName } : {}),
    ...(member.yearOfBirth ? { yearOfBirth: member.yearOfBirth } : {}),
    prayerHistory: member.prayerHistory ?? [],
  };
}

function mapDeceasedPerson(person: RpcDeceasedPerson): HouseholdDeceasedPerson {
  if (!isValidLunarDayMonth(person.dateOfDeath)) throw new Error('Dữ liệu ngày mất âm lịch không hợp lệ.');
  return { ...person, dateOfDeath: { ...person.dateOfDeath }, prayerHistory: person.prayerHistory ?? [] };
}

function mapHousehold(row: RpcHousehold): Household {
  return {
    id: row.id,
    businessNumber: row.businessNumber,
    ...(row.legacyNumber ? { oldNumber: row.legacyNumber } : {}),
    families: row.families.map((family) => ({
      id: family.id,
      businessNumber: family.businessNumber,
      address: family.address,
      members: family.members.map(mapMember),
      deceasedPeople: family.deceasedPeople?.map(mapDeceasedPerson) ?? [],
    })),
  };
}

export async function searchHouseholds(
  query: string,
): Promise<Array<{ id: string; businessNumber: number; legacyNumber?: number; addresses: string[] }>> {
  const { data, error } = await requireSupabase().rpc('search_households', { p_pagoda_id: activePagodaId(), p_query: query.trim() });
  if (error) throw new Error(error.message);
  const grouped = new Map<string, { id: string; businessNumber: number; legacyNumber?: number; addresses: string[] }>();
  for (const row of (data ?? []) as Array<{ id: string; business_number: number; legacy_number: number | null; address: string }>) {
    const household = grouped.get(row.id) ?? {
      id: row.id,
      businessNumber: row.business_number,
      ...(row.legacy_number ? { legacyNumber: row.legacy_number } : {}),
      addresses: [],
    };
    if (!household.addresses.includes(row.address)) household.addresses.push(row.address);
    grouped.set(row.id, household);
  }
  return [...grouped.values()];
}

export async function getHouseholdWorkspace(id: string): Promise<Household> {
  const { data, error } = await requireSupabase().rpc('get_household_workspace', { p_pagoda_id: activePagodaId(), p_household_id: id });
  if (error) throw new Error(error.message);
  return mapHousehold(data as RpcHousehold);
}

export async function createHousehold(household: Household): Promise<Household> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_household', {
    p_pagoda_id: activePagodaId(),
    p_legacy_number: household.oldNumber ?? null,
    p_families: household.families.map((family) => ({
      address: family.address,
      members: family.members.map((member) => ({ fullName: member.fullName, dharmaName: member.dharmaName ?? null, yearOfBirth: member.yearOfBirth ?? null })),
    })),
  });
  if (error) throw new Error(error.message.includes('duplicate') ? 'Mã hộ đã tồn tại.' : error.message);
  return mapHousehold(data as RpcHousehold);
}
