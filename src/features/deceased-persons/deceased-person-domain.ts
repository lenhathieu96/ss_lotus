import { normalizeUppercase } from '../households/household-domain';

export interface DeceasedPerson {
  code: string;
  fullName: string;
  dharmaName: string;
  dateOfDeath: string;
  createdBy: string;
  householdReference?: string;
  familyReference?: string;
}

export type DeceasedPersonInput = Omit<DeceasedPerson, 'code'> & { code: string };

export function normalizeDeceasedPerson(input: DeceasedPersonInput): DeceasedPerson {
  return {
    code: normalizeUppercase(input.code), fullName: normalizeUppercase(input.fullName),
    dharmaName: normalizeUppercase(input.dharmaName), dateOfDeath: input.dateOfDeath.trim(),
    createdBy: normalizeUppercase(input.createdBy), householdReference: normalizeUppercase(input.householdReference ?? ''),
    familyReference: normalizeUppercase(input.familyReference ?? ''),
  };
}

export function searchDeceasedPerson(person: DeceasedPerson, query: string): boolean {
  const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi-VN');
  return fold(Object.values(person).join(' ')).includes(fold(query.trim()));
}
