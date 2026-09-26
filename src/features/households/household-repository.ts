import { supabase } from '../../lib/supabase';
import { Family, Household, HouseholdDeceasedPerson, Member, PrayerHistory } from './household-domain';
import { LunarDayMonth, isValidLunarDayMonth } from '../calendar/lunar-date-domain';

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

type RpcMember = { id: string; fullName: string; dharmaName?: string | null; yearOfBirth?: number | null; prayerHistory?: PrayerHistory[] };
type RpcDeceasedPerson = { id: string; code: string; fullName: string; dharmaName?: string | null; dateOfDeath: LunarDayMonth; prayerHistory?: PrayerHistory[] };
type RpcFamily = { id: string; businessNumber: number; address: string; members: RpcMember[]; deceasedPeople?: RpcDeceasedPerson[] };
type RpcHousehold = { id: string; businessNumber: number; legacyNumber?: number | null; families: RpcFamily[] };

function mapMember(member: RpcMember): Member {
  return { id: member.id, fullName: member.fullName, ...(member.dharmaName ? { dharmaName: member.dharmaName } : {}), ...(member.yearOfBirth ? { yearOfBirth: member.yearOfBirth } : {}), prayerHistory: member.prayerHistory ?? [] };
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
    families: row.families.map((family) => ({ id: family.id, businessNumber: family.businessNumber, address: family.address, members: family.members.map(mapMember), deceasedPeople: family.deceasedPeople?.map(mapDeceasedPerson) ?? [] })),
  };
}

export async function searchHouseholds(query: string): Promise<Array<{ id: string; businessNumber: number; legacyNumber?: number; addresses: string[] }>> {
  const { data, error } = await requireSupabase().rpc('search_households', { p_query: query.trim() });
  if (error) throw new Error(error.message);
  const grouped = new Map<string, { id: string; businessNumber: number; legacyNumber?: number; addresses: string[] }>();
  for (const row of (data ?? []) as Array<{ id: string; business_number: number; legacy_number: number | null; address: string }>) {
    const household = grouped.get(row.id) ?? { id: row.id, businessNumber: row.business_number, ...(row.legacy_number ? { legacyNumber: row.legacy_number } : {}), addresses: [] };
    if (!household.addresses.includes(row.address)) household.addresses.push(row.address);
    grouped.set(row.id, household);
  }
  return [...grouped.values()];
}

export async function getHouseholdWorkspace(id: string): Promise<Household> {
  const { data, error } = await requireSupabase().rpc('get_household_workspace', { p_household_id: id });
  if (error) throw new Error(error.message);
  return mapHousehold(data as RpcHousehold);
}

export async function createHousehold(household: Household): Promise<Household> {
  const client = requireSupabase();
  const { data, error } = await client.rpc('create_household', {
    p_legacy_number: household.oldNumber ?? null,
    p_families: household.families.map((family) => ({
      address: family.address,
      members: family.members.map((member) => ({ fullName: member.fullName, dharmaName: member.dharmaName ?? null, yearOfBirth: member.yearOfBirth ?? null })),
    })),
  });
  if (error) throw new Error(error.message.includes('duplicate') ? 'Mã hộ đã tồn tại.' : error.message);
  return mapHousehold(data as RpcHousehold);
}
