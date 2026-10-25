import { supabase } from '@data/network/supabase/browser-client';
import { type LunarDayMonth, isValidLunarDayMonth } from '@features/calendar/lunar-date-domain';
import { activePagodaId } from '@features/pagodas/pagoda-client';

export type PrayerType = 'wellbeing' | 'memorial';
export type CeremonyPeriod = 'morning' | 'afternoon' | 'evening';

export interface PrayerHistory { date: string; period: CeremonyPeriod; }
export interface Member {
  id: string;
  fullName: string;
  dharmaName?: string;
  yearOfBirth?: number;
  prayerHistory?: PrayerHistory[];
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
export interface HouseholdOperation {
  kind: 'archive-member' | 'split-family' | 'merge-family';
  memberId?: string;
  sourceFamilyId?: string;
  targetFamilyId?: string;
}
export interface WellbeingBookingSummary {
  slotId: string;
  solarDate: string;
  period: CeremonyPeriod;
  lunarYear: number;
}
export interface Household {
  id: string;
  businessNumber?: number;
  oldNumber?: number;
  families: Family[];
  revision?: number;
  headMember?: Pick<Member, 'id' | 'fullName' | 'dharmaName'> | null;
  wellbeingBooking?: WellbeingBookingSummary | null;
  operations?: HouseholdOperation[];
}
export interface HouseholdSearchResult {
  id: string;
  businessNumber: number;
  legacyNumber?: number;
  addresses: string[];
  familyCount: number;
  memberCount: number;
  headMember?: Pick<Member, 'id' | 'fullName' | 'dharmaName'> | null;
}
export interface HouseholdEditorState {
  household: Household | null;
  isDirty: boolean;
  canSave: boolean;
  canPrint: boolean;
}

export function normalizeUppercase(value: string): string { return value.trim().toLocaleUpperCase('vi-VN'); }
export function hasEmptyFamily(household: Household | null): boolean { return household?.families.some((family) => family.members.length === 0) ?? false; }
export function allowedPeriods(_type: PrayerType): CeremonyPeriod[] { return ['morning', 'afternoon', 'evening']; }
export function isFutureOrToday(date: Date, today = new Date()): boolean {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()) >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

type HouseholdAction =
  | { type: 'family-added'; address: string }
  | { type: 'member-added'; familyId: string; member: Member }
  | { type: 'members-reordered'; familyId: string; fromIndex: number; toIndex: number }
  | { type: 'member-moved'; memberId: string; fromFamilyId: string; toFamilyId: string; toIndex: number }
  | { type: 'family-address-updated'; familyId: string; address: string }
  | { type: 'member-archived'; familyId: string; memberId: string }
  | { type: 'families-merged'; sourceFamilyId: string; targetFamilyId: string }
  | { type: 'family-split'; sourceFamilyId: string; memberId: string; address: string; familyId: string }
  | { type: 'loaded'; household: Household }
  | { type: 'saved'; household?: Household }
  | { type: 'cleared' };

export function createDraftHousehold(): HouseholdEditorState { return { household: null, isDirty: false, canSave: false, canPrint: false }; }
function withDraft(household: Household): HouseholdEditorState {
  return { household, isDirty: true, canSave: household.families.length > 0 && !hasEmptyFamily(household), canPrint: false };
}
function createFamily(address: string, index: number): Family { return { id: `family-${index + 1}`, address: normalizeUppercase(address), members: [] }; }

export function householdReducer(state: HouseholdEditorState, action: HouseholdAction): HouseholdEditorState {
  if (action.type === 'loaded') return { household: action.household, isDirty: false, canSave: false, canPrint: true };
  if (action.type === 'cleared') return createDraftHousehold();
  if (action.type === 'saved') return state.household && !hasEmptyFamily(state.household)
    ? { household: action.household ?? state.household, isDirty: false, canSave: false, canPrint: true } : state;
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
      const members = [...family.members]; const [member] = members.splice(action.fromIndex, 1);
      if (!member) return family; members.splice(action.toIndex, 0, member); return { ...family, members };
    }) });
  }
  if (action.type === 'family-address-updated') return withDraft({ ...state.household, families: state.household.families.map((family) => family.id === action.familyId ? { ...family, address: normalizeUppercase(action.address) } : family) });
  if (action.type === 'member-archived') return withDraft({ ...state.household, families: state.household.families.map((family) => family.id === action.familyId ? { ...family, members: family.members.filter((member) => member.id !== action.memberId) } : family), operations: [...(state.household.operations ?? []), { kind: 'archive-member', memberId: action.memberId }] });
  if (action.type === 'families-merged') {
    const source = state.household.families.find((family) => family.id === action.sourceFamilyId);
    const target = state.household.families.find((family) => family.id === action.targetFamilyId);
    if (!source || !target || source.id === target.id) return state;
    return withDraft({ ...state.household, families: state.household.families.filter((family) => family.id !== source.id).map((family) => family.id === target.id ? { ...family, members: [...family.members, ...source.members], deceasedPeople: [...(family.deceasedPeople ?? []), ...(source.deceasedPeople ?? [])] } : family), operations: [...(state.household.operations ?? []), { kind: 'merge-family', sourceFamilyId: source.id, targetFamilyId: target.id }] });
  }
  if (action.type === 'family-split') {
    const source = state.household.families.find((family) => family.id === action.sourceFamilyId);
    const member = source?.members.find((candidate) => candidate.id === action.memberId);
    if (!source || !member || source.members.length < 2) return state;
    return withDraft({ ...state.household, families: [...state.household.families.map((family) => family.id === source.id ? { ...family, members: family.members.filter((candidate) => candidate.id !== member.id) } : family), { id: action.familyId, address: normalizeUppercase(action.address), members: [member], deceasedPeople: [] }], operations: [...(state.household.operations ?? []), { kind: 'split-family', sourceFamilyId: source.id, memberId: member.id }] });
  }
  const source = state.household.families.find((family) => family.id === action.fromFamilyId);
  const member = source?.members.find((candidate) => candidate.id === action.memberId);
  if (!source || !member) return state;
  const withoutSource = state.household.families.map((family) => family.id === source.id ? { ...family, members: family.members.filter((candidate) => candidate.id !== member.id) } : family);
  return withDraft({ ...state.household, families: withoutSource.map((family) => {
    if (family.id !== action.toFamilyId) return family;
    const members = [...family.members]; members.splice(Math.min(action.toIndex, members.length), 0, member); return { ...family, members };
  }) });
}

type RpcMember = Member;
type RpcDeceasedPerson = HouseholdDeceasedPerson;
type RpcFamily = Omit<Family, 'members' | 'deceasedPeople'> & { businessNumber: number; members: RpcMember[]; deceasedPeople?: RpcDeceasedPerson[] };
type RpcHousehold = Omit<Household, 'families' | 'oldNumber'> & { businessNumber: number; legacyNumber?: number | null; families: RpcFamily[] };

function requireSupabase() { if (!supabase) throw new Error('Thiếu cấu hình Supabase.'); return supabase; }
function makeRequestKey(): string { return crypto.randomUUID(); }
function mapMember(member: RpcMember): Member {
  return { id: member.id, fullName: member.fullName, ...(member.dharmaName ? { dharmaName: member.dharmaName } : {}), ...(member.yearOfBirth ? { yearOfBirth: member.yearOfBirth } : {}), prayerHistory: member.prayerHistory ?? [] };
}
function mapDeceasedPerson(person: RpcDeceasedPerson): HouseholdDeceasedPerson {
  if (!isValidLunarDayMonth(person.dateOfDeath)) throw new Error('Dữ liệu ngày mất âm lịch không hợp lệ.');
  return { ...person, dateOfDeath: { ...person.dateOfDeath }, prayerHistory: person.prayerHistory ?? [] };
}
export function mapHousehold(row: RpcHousehold): Household {
  return { id: row.id, businessNumber: row.businessNumber, ...(row.legacyNumber ? { oldNumber: row.legacyNumber } : {}), revision: row.revision ?? 0, headMember: row.headMember ?? null, wellbeingBooking: row.wellbeingBooking ?? null,
    families: row.families.map((family) => ({ id: family.id, businessNumber: family.businessNumber, address: family.address, members: family.members.map(mapMember), deceasedPeople: family.deceasedPeople?.map(mapDeceasedPerson) ?? [] })) };
}

function throwRpcError(error: { message: string; details?: string | null }): never {
  let category: string | undefined;
  try { category = JSON.parse(error.details ?? '').category; } catch { /* provider may return plain text */ }
  const messages: Record<string, string> = {
    AUTH_REQUIRED: 'Bạn không có quyền thao tác tại chùa này.', CROSS_PAGODA_OR_NOT_FOUND: 'Không tìm thấy hộ gia đình.', INVALID_DRAFT: 'Dữ liệu hộ gia đình chưa hợp lệ.', REVISION_CONFLICT: 'Hộ gia đình vừa được thay đổi ở nơi khác. Hãy tải lại.', REQUEST_REPLAY_MISMATCH: 'Yêu cầu lặp lại không khớp dữ liệu ban đầu.', SEASON_UNAVAILABLE: 'Chưa có mùa Cầu An phù hợp.', INVALID_SLOT: 'Khóa Cầu An không hợp lệ.', SLOT_FULL: 'Khóa Cầu An đã đủ 200 hộ.', DEPENDENT_REFERENCE: 'Không thể thay đổi vì còn dữ liệu liên quan.',
  };
  throw new Error(category && messages[category] ? messages[category] : error.message);
}

export async function searchHouseholds(query: string): Promise<HouseholdSearchResult[]> {
  const { data, error } = await requireSupabase().rpc('search_households_v2', { p_pagoda_id: activePagodaId(), p_query: query.trim(), p_limit: 50 });
  if (error) throwRpcError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({ id: String(row.id), businessNumber: Number(row.business_number), ...(row.legacy_number ? { legacyNumber: Number(row.legacy_number) } : {}), addresses: (row.addresses as string[] | null) ?? [], familyCount: Number(row.family_count ?? 0), memberCount: Number(row.member_count ?? 0), headMember: row.head_member as HouseholdSearchResult['headMember'] }));
}
export async function getHouseholdWorkspace(id: string): Promise<Household> {
  const { data, error } = await requireSupabase().rpc('get_household_workspace_v2', { p_pagoda_id: activePagodaId(), p_household_id: id });
  if (error) throwRpcError(error); return mapHousehold(data as RpcHousehold);
}
function serializeFamilies(household: Household) {
  return household.families.map((family, familyPosition) => ({ id: family.id.startsWith('family-') ? null : family.id, clientKey: family.id, address: family.address, position: familyPosition,
    members: family.members.map((member, memberPosition) => ({ id: member.id.startsWith('member-') ? null : member.id, clientKey: member.id, fullName: member.fullName, dharmaName: member.dharmaName ?? null, yearOfBirth: member.yearOfBirth ?? null, position: memberPosition })) }));
}
export async function createHousehold(household: Household, requestKey = makeRequestKey()): Promise<Household> {
  const { data, error } = await requireSupabase().rpc('create_household_v2', { p_pagoda_id: activePagodaId(), p_idempotency_key: requestKey, p_payload: { legacyNumber: household.oldNumber ?? null, families: serializeFamilies(household) } });
  if (error) throwRpcError(error); return mapHousehold(data as RpcHousehold);
}
export async function saveHouseholdWorkspace(household: Household, requestKey = makeRequestKey()): Promise<Household> {
  if (household.revision === undefined) throw new Error('Thiếu phiên bản hộ gia đình. Hãy tải lại trước khi lưu.');
  const { data, error } = await requireSupabase().rpc('save_household_workspace', { p_pagoda_id: activePagodaId(), p_household_id: household.id, p_expected_revision: household.revision, p_idempotency_key: requestKey, p_payload: { families: serializeFamilies(household), operations: household.operations ?? [] } });
  if (error) throwRpcError(error); return mapHousehold(data as RpcHousehold);
}
