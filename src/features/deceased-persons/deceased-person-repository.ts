import { supabase } from '@data/network/supabase/browser-client';
import { normalizeUppercase, type PrayerHistory } from '@features/households/household-repository';
import { formatLunarDayMonth, isValidLunarDayMonth, type LunarDayMonth } from '@features/calendar/lunar-date-domain';
import { activePagodaId } from '@features/pagodas/pagoda-client';

export interface DeceasedPerson {
  id?: string;
  code: string;
  fullName: string;
  dharmaName: string;
  dateOfDeath: LunarDayMonth;
  createdBy: string;
  householdReference?: string;
  familyReference?: string;
  prayerHistory?: PrayerHistory[];
}

export type DeceasedPersonInput = Omit<DeceasedPerson, 'code'> & { code: string };

export function normalizeDeceasedPerson(input: DeceasedPersonInput): DeceasedPerson {
  return {
    code: normalizeUppercase(input.code),
    fullName: normalizeUppercase(input.fullName),
    dharmaName: normalizeUppercase(input.dharmaName),
    dateOfDeath: { ...input.dateOfDeath, isLeap: input.dateOfDeath.isLeap === true },
    createdBy: normalizeUppercase(input.createdBy),
    householdReference: normalizeUppercase(input.householdReference ?? ''),
    familyReference: normalizeUppercase(input.familyReference ?? ''),
  };
}

export function searchDeceasedPerson(person: DeceasedPerson, query: string): boolean {
  const fold = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN');
  const searchable = [
    person.code,
    person.fullName,
    person.dharmaName,
    formatLunarDayMonth(person.dateOfDeath),
    person.createdBy,
    person.householdReference ?? '',
    person.familyReference ?? '',
  ];
  return fold(searchable.join(' ')).includes(fold(query.trim()));
}

export interface DeceasedPersonCatalogState {
  people: DeceasedPerson[];
}
export type DeceasedPersonCatalogAction =
  | { type: 'catalog-loaded'; people: DeceasedPerson[] }
  | { type: 'person-added'; person: DeceasedPerson }
  | { type: 'people-imported'; people: DeceasedPerson[] };

export function deceasedPersonCatalogReducer(state: DeceasedPersonCatalogState, action: DeceasedPersonCatalogAction): DeceasedPersonCatalogState {
  if (action.type === 'catalog-loaded') return { people: action.people };
  return action.type === 'person-added' ? { people: [...state.people, action.person] } : { people: [...state.people, ...action.people] };
}

export const deceasedPersonCsvHeaders = ['ma_so', 'ho_ten', 'phap_danh', 'ngay_mat', 'nguoi_lap', 'ma_ho', 'ma_gia_dinh'] as const;
type Header = typeof deceasedPersonCsvHeaders[number];
export interface ImportRow {
  rowNumber: number;
  person?: DeceasedPerson;
  errors: string[];
}
export interface ImportPreview {
  rows: ImportRow[];
  validRows: DeceasedPerson[];
  invalidRows: ImportRow[];
}

function csvCells(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      cell += char;
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function parseLunarDate(value: string, isLeapValue: string): LunarDayMonth | null {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const normalizedLeap = isLeapValue.trim().toLocaleLowerCase('vi-VN');
  const isLeap = ['true', '1', 'yes', 'y', 'có', 'co', 'nhuận', 'nhuan'].includes(normalizedLeap);
  if (normalizedLeap && !isLeap && !['false', '0', 'no', 'n', 'không', 'khong', 'thường', 'thuong'].includes(normalizedLeap)) return null;
  const date = { day: Number(match[1]), month: Number(match[2]), isLeap };
  return isValidLunarDayMonth(date) ? date : null;
}

export function parseDeceasedPersonCsv(content: string, existingCodes: string[] = []): ImportPreview {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const headers = csvCells(lines[0] ?? '');
  const missing = deceasedPersonCsvHeaders.filter((header) => !headers.includes(header));
  if (missing.length) {
    const row = { rowNumber: 1, errors: [`Dòng 1: Thiếu cột ${missing.join(', ')}.`] };
    return { rows: [row], validRows: [], invalidRows: [row] };
  }

  const seen = new Set(existingCodes.map((code) => code.trim().toLocaleUpperCase('vi-VN')));
  const rows = lines.slice(1).map((line, index) => {
    const values = csvCells(line);
    const source = Object.fromEntries(
      headers.map((header, cellIndex) => [header, values[cellIndex] ?? '']),
    ) as Record<Header, string> & { thang_nhuan?: string };
    const dateOfDeath = parseLunarDate(source.ngay_mat, source.thang_nhuan ?? '');
    const person = normalizeDeceasedPerson({
      code: source.ma_so,
      fullName: source.ho_ten,
      dharmaName: source.phap_danh,
      dateOfDeath: dateOfDeath ?? { day: 0, month: 0, isLeap: false },
      createdBy: source.nguoi_lap,
      householdReference: source.ma_ho,
      familyReference: source.ma_gia_dinh,
    });
    const rowNumber = index + 2;
    const errors: string[] = [];

    if (!person.code) {
      errors.push(`Dòng ${rowNumber}: Mã số là bắt buộc.`);
    } else if (seen.has(person.code)) {
      errors.push(`Dòng ${rowNumber}: Mã số trùng: ${person.code}.`);
    } else {
      seen.add(person.code);
    }
    if (!person.fullName) errors.push(`Dòng ${rowNumber}: Họ tên là bắt buộc.`);
    if (!isValidLunarDayMonth(person.dateOfDeath)) errors.push(`Dòng ${rowNumber}: Ngày mất âm lịch không hợp lệ; dùng dd/mm và ghi tháng nhuận ở cột thang_nhuan.`);
    if (!person.createdBy) errors.push(`Dòng ${rowNumber}: Người lập là bắt buộc.`);
    if (person.householdReference && !isBusinessNumber(person.householdReference)) errors.push(`Dòng ${rowNumber}: Mã hộ không hợp lệ.`);
    if (person.familyReference && !isBusinessNumber(person.familyReference)) errors.push(`Dòng ${rowNumber}: Mã gia đình không hợp lệ.`);
    if (!!person.householdReference !== !!person.familyReference) errors.push(`Dòng ${rowNumber}: Mã hộ và mã gia đình phải nhập cùng nhau.`);
    return { rowNumber, person, errors };
  });

  return {
    rows,
    validRows: rows.filter((row) => !row.errors.length).map((row) => row.person!),
    invalidRows: rows.filter((row) => row.errors.length),
  };
}

function requireClient() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

function requireBusinessNumber(value: string, label: string): number {
  if (!isBusinessNumber(value)) throw new Error(`${label} không hợp lệ.`);
  return Number(value);
}

function isBusinessNumber(value: string): boolean {
  const parsed = Number(value);
  return /^\d{1,10}$/.test(value) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 2_147_483_647;
}

function readLunarDayMonth(row: Record<string, unknown>): LunarDayMonth {
  const value = {
    day: Number(row.death_lunar_day),
    month: Number(row.death_lunar_month),
    isLeap: row.death_lunar_is_leap === true,
  };
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
    p_pagoda_id: activePagodaId(),
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
  const { data, error } = await requireClient().rpc('list_deceased_people', { p_pagoda_id: activePagodaId() });
  if (error) throw toUserMessage(error);
  return (data ?? []).map((row: unknown) => toCatalogPerson(row as Record<string, unknown>));
}

export async function createDeceasedPerson(person: DeceasedPerson): Promise<void> {
  const { error } = await requireClient().rpc('create_deceased_person', {
    p_pagoda_id: activePagodaId(),
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
    const hasInvalidHousehold = person.householdReference && !isBusinessNumber(person.householdReference);
    const hasInvalidFamily = person.familyReference && !isBusinessNumber(person.familyReference);
    if (hasInvalidHousehold || hasInvalidFamily) {
      throw new Error('Mã hộ và mã gia đình không hợp lệ.');
    }
    if (!!person.householdReference !== !!person.familyReference) throw new Error('Mã hộ và mã gia đình phải nhập cùng nhau.');
  });
  const { error } = await requireClient().rpc('import_deceased_people', { p_pagoda_id: activePagodaId(), p_people: people });
  if (error) throw toUserMessage(error);
}
