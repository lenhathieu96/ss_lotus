import { supabase } from '../../lib/supabase';
import { DeceasedPerson } from './deceased-person-domain';
import { LunarDayMonth, isValidLunarDayMonth } from '../calendar/lunar-date-domain';

function requireClient() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

function requireBusinessNumber(value: string, label: string): number {
  if (!/^\d{1,4}$/.test(value)) throw new Error(`${label} phải là mã số từ 1 đến 4 chữ số.`);
  return Number(value);
}

function readLunarDayMonth(row: Record<string, unknown>): LunarDayMonth {
  const value = { day: Number(row.death_lunar_day), month: Number(row.death_lunar_month), isLeap: row.death_lunar_is_leap === true };
  if (!isValidLunarDayMonth(value) || typeof row.death_lunar_is_leap !== 'boolean') throw new Error('Dữ liệu ngày mất âm lịch không hợp lệ.');
  return value;
}

function toCatalogPerson(row: Record<string, unknown>): DeceasedPerson {
  const history = Array.isArray(row.prayer_history) ? row.prayer_history as Array<{ date: string; period: 'morning' | 'afternoon' | 'evening' }> : [];
  return {
    id: String(row.id),
    code: String(row.code),
    fullName: String(row.full_name),
    dharmaName: String(row.dharma_name ?? ''),
    dateOfDeath: readLunarDayMonth(row),
    createdBy: String(row.recorded_by),
    householdReference: row.household_reference ? String(row.household_reference) : '',
    familyReference: row.family_reference ? String(row.family_reference) : '',
    prayerHistory: history,
  };
}

export async function updateDeceasedPersonAssociation(person: DeceasedPerson): Promise<void> {
  if (!person.id) throw new Error('Thiếu mã định danh hương linh.');
  if (!!person.householdReference !== !!person.familyReference) throw new Error('Mã hộ và mã gia đình phải nhập cùng nhau.');
  const { error } = await requireClient().rpc('update_deceased_person_association', {
    p_deceased_person_id: person.id,
    p_household_business_number: person.householdReference ? requireBusinessNumber(person.householdReference, 'Mã hộ') : null,
    p_family_business_number: person.familyReference ? requireBusinessNumber(person.familyReference, 'Mã gia đình') : null,
  });
  if (error) throw toUserMessage(error);
}

function toUserMessage(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('Mã số đã tồn tại.');
  return new Error(error.message);
}

export async function listDeceasedPeople(): Promise<DeceasedPerson[]> {
  const { data, error } = await requireClient().rpc('list_deceased_people');
  if (error) throw toUserMessage(error);
  return (data ?? []).map((row: unknown) => toCatalogPerson(row as Record<string, unknown>));
}

export async function createDeceasedPerson(person: DeceasedPerson): Promise<void> {
  const { error } = await requireClient().rpc('create_deceased_person', {
    p_code: person.code,
    p_full_name: person.fullName,
    p_dharma_name: person.dharmaName,
    p_death_lunar_day: person.dateOfDeath.day,
    p_death_lunar_month: person.dateOfDeath.month,
    p_death_lunar_is_leap: person.dateOfDeath.isLeap,
    p_recorded_by: person.createdBy,
    p_household_business_number: person.householdReference ? requireBusinessNumber(person.householdReference, 'Mã hộ') : null,
    p_family_business_number: person.familyReference ? requireBusinessNumber(person.familyReference, 'Mã gia đình') : null,
  });
  if (error) throw toUserMessage(error);
}

export async function importDeceasedPeople(people: DeceasedPerson[]): Promise<void> {
  people.forEach((person) => {
    if ((person.householdReference && !/^\d{1,4}$/.test(person.householdReference)) || (person.familyReference && !/^\d{1,4}$/.test(person.familyReference))) throw new Error('Mã hộ và mã gia đình phải từ 1 đến 4 chữ số.');
    if (!!person.householdReference !== !!person.familyReference) throw new Error('Mã hộ và mã gia đình phải nhập cùng nhau.');
  });
  const { error } = await requireClient().rpc('import_deceased_people', { p_people: people });
  if (error) throw toUserMessage(error);
}
