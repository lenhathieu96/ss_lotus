import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { rpc } }));

import { createDeceasedPerson, importDeceasedPeople, listDeceasedPeople } from './deceased-person-repository';

describe('deceased-person repository', () => {
  beforeEach(() => rpc.mockReset());

  it('maps the yearless list RPC fields into a lunar day/month value', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'spirit-1', code: 'HL-01', full_name: 'HƯƠNG LINH A', dharma_name: null, death_lunar_day: 1, death_lunar_month: 2, death_lunar_is_leap: true, recorded_by: 'ADMIN', household_reference: null, family_reference: null, prayer_history: [] }], error: null });

    await expect(listDeceasedPeople()).resolves.toEqual([expect.objectContaining({ dateOfDeath: { day: 1, month: 2, isLeap: true } })]);
    expect(rpc).toHaveBeenCalledWith('list_deceased_people');
  });

  it('sends only explicit yearless fields to the create RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await createDeceasedPerson({ code: 'HL-01', fullName: 'HƯƠNG LINH A', dharmaName: '', dateOfDeath: { day: 1, month: 2, isLeap: true }, createdBy: 'ADMIN', householdReference: '', familyReference: '' });

    expect(rpc).toHaveBeenCalledWith('create_deceased_person', expect.objectContaining({ p_death_lunar_day: 1, p_death_lunar_month: 2, p_death_lunar_is_leap: true }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_date_of_death');
  });

  it('keeps the typed death date when importing a batch', async () => {
    rpc.mockResolvedValue({ error: null });
    const people = [{ code: 'HL-01', fullName: 'HƯƠNG LINH A', dharmaName: '', dateOfDeath: { day: 1, month: 2, isLeap: false }, createdBy: 'ADMIN', householdReference: '', familyReference: '' }];

    await importDeceasedPeople(people);

    expect(rpc).toHaveBeenCalledWith('import_deceased_people', { p_people: people });
  });
});
