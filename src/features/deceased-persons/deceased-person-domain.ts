import { normalizeUppercase } from "../households/household-domain";
import { PrayerHistory } from "../households/household-domain";
import { LunarDayMonth, formatLunarDayMonth } from '../calendar/lunar-date-domain';

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

export type DeceasedPersonInput = Omit<DeceasedPerson, "code"> & {
  code: string;
};

export function normalizeDeceasedPerson(
  input: DeceasedPersonInput,
): DeceasedPerson {
  return {
    code: normalizeUppercase(input.code),
    fullName: normalizeUppercase(input.fullName),
    dharmaName: normalizeUppercase(input.dharmaName),
    dateOfDeath: { ...input.dateOfDeath, isLeap: input.dateOfDeath.isLeap === true },
    createdBy: normalizeUppercase(input.createdBy),
    householdReference: normalizeUppercase(input.householdReference ?? ""),
    familyReference: normalizeUppercase(input.familyReference ?? ""),
  };
}

export function searchDeceasedPerson(
  person: DeceasedPerson,
  query: string,
): boolean {
  const fold = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLocaleLowerCase("vi-VN");
  const searchable = [person.code, person.fullName, person.dharmaName, formatLunarDayMonth(person.dateOfDeath), person.createdBy, person.householdReference ?? '', person.familyReference ?? ''];
  return fold(searchable.join(" ")).includes(fold(query.trim()));
}
