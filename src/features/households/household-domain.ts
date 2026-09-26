import type { LunarDayMonth } from '../calendar/lunar-date-domain';

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
