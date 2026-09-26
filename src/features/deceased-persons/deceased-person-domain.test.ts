import { describe, expect, it } from 'vitest';
import { normalizeDeceasedPerson, searchDeceasedPerson } from './deceased-person-domain';

describe('deceased-person domain', () => {
  it('keeps a yearless death date searchable without serializing it as an object', () => {
    const person = normalizeDeceasedPerson({
      code: 'hl-01', fullName: 'Nguyễn Văn An', dharmaName: '',
      dateOfDeath: { day: 1, month: 2, isLeap: true }, createdBy: 'Admin',
      householdReference: '', familyReference: '',
    });

    expect(person.dateOfDeath).toEqual({ day: 1, month: 2, isLeap: true });
    expect(searchDeceasedPerson(person, '01/02')).toBe(true);
    expect(searchDeceasedPerson(person, 'nhuận')).toBe(true);
  });
});
