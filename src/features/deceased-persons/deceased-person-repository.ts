import { supabase } from '../../lib/supabase';
import { DeceasedPerson } from './deceased-person-domain';

function requireClient() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

function requireBusinessNumber(value: string, label: string): number {
  if (!/^\d{1,4}$/.test(value)) throw new Error(`${label} phải là mã số từ 1 đến 4 chữ số.`);
  return Number(value);
}

function toCatalogPerson(row: Record<string, unknown>): DeceasedPerson {
  return {
    code: String(row.code),
    fullName: String(row.full_name),
    dharmaName: String(row.dharma_name ?? ''),
    dateOfDeath: String(row.date_of_death),
    createdBy: String(row.recorded_by),
    householdReference: row.household_reference ? String(row.household_reference) : '',
    familyReference: row.family_reference ? String(row.family_reference) : '',
  };
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
    p_date_of_death: person.dateOfDeath,
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
