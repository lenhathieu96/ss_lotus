import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@data/network/supabase/browser-client', () => ({ supabase: { rpc } }));
vi.mock('@features/pagodas/pagoda-client', () => ({ activePagodaId: () => 'pagoda-1' }));

import { createDeceasedPerson, importDeceasedPeople, listDeceasedPeople, normalizeDeceasedPerson, parseDeceasedPersonCsv, searchDeceasedPerson } from './deceased-person-repository';

describe('deceased-person repository', () => {
  beforeEach(() => rpc.mockReset());

  it('maps the yearless list RPC fields into a lunar day/month value', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'spirit-1', code: 'HL-01', full_name: 'HƯƠNG LINH A', dharma_name: null, death_lunar_day: 1, death_lunar_month: 2, death_lunar_is_leap: true, recorded_by: 'ADMIN', household_reference: null, family_reference: null, prayer_history: [] }], error: null });

    await expect(listDeceasedPeople()).resolves.toEqual([expect.objectContaining({ dateOfDeath: { day: 1, month: 2, isLeap: true } })]);
    expect(rpc).toHaveBeenCalledWith('list_deceased_people', { p_pagoda_id: 'pagoda-1' });
  });

  it('sends only explicit yearless fields to the create RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await createDeceasedPerson({ code: 'HL-01', fullName: 'HƯƠNG LINH A', dharmaName: '', dateOfDeath: { day: 1, month: 2, isLeap: true }, createdBy: 'ADMIN', householdReference: '', familyReference: '' });

    expect(rpc).toHaveBeenCalledWith('create_deceased_person', expect.objectContaining({ p_pagoda_id: 'pagoda-1', p_death_lunar_day: 1, p_death_lunar_month: 2, p_death_lunar_is_leap: true }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_date_of_death');
  });

  it('keeps the typed death date when importing a batch', async () => {
    rpc.mockResolvedValue({ error: null });
    const people = [{ code: 'HL-01', fullName: 'HƯƠNG LINH A', dharmaName: '', dateOfDeath: { day: 1, month: 2, isLeap: false }, createdBy: 'ADMIN', householdReference: '', familyReference: '' }];

    await importDeceasedPeople(people);

    expect(rpc).toHaveBeenCalledWith('import_deceased_people', { p_pagoda_id: 'pagoda-1', p_people: people });
  });
});

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

const header = 'ma_so,ho_ten,phap_danh,ngay_mat,nguoi_lap,ma_ho,ma_gia_dinh';

describe('parseDeceasedPersonCsv', () => {
  it('parses UTF-8 BOM CSV and normalizes a valid Vietnamese row', () => {
    const preview = parseDeceasedPersonCsv(`\uFEFF${header}\nNS-001,Nguyễn Văn An,Thiện Tâm,01/01,Admin,1,2`);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows[0]).toMatchObject({ code: 'NS-001', fullName: 'NGUYỄN VĂN AN', dharmaName: 'THIỆN TÂM', dateOfDeath: { day: 1, month: 1, isLeap: false } });
  });

  it('reports source-row errors for duplicate codes and invalid required values', () => {
    const preview = parseDeceasedPersonCsv(`${header}\nNS-001,,Tâm,31/02,,1,\nNS-001,Trần B,Phúc,01/01,Admin,2,3`, ['NS-001']);
    expect(preview.validRows).toHaveLength(0);
    expect(preview.invalidRows).toHaveLength(2);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Dòng 2.*Mã số trùng/);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Ngày mất âm lịch không hợp lệ/);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Mã hộ và mã gia đình phải nhập cùng nhau/);
  });

  it('uses the optional leap-month flag without converting or storing a year', () => {
    const preview = parseDeceasedPersonCsv(`ma_so,ho_ten,phap_danh,ngay_mat,nguoi_lap,ma_ho,ma_gia_dinh,thang_nhuan\nNS-LEAP,Nguyễn Văn An,Tâm,01/02,Admin,,,true`);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows[0].dateOfDeath).toEqual({ day: 1, month: 2, isLeap: true });
  });

  it('rejects legacy day/month/year input instead of discarding the year', () => {
    const preview = parseDeceasedPersonCsv(`${header}\nNS-OLD,Nguyễn Văn An,Tâm,01/02/2024,Admin,,`);
    expect(preview.invalidRows).toHaveLength(1);
    expect(preview.invalidRows[0].errors.join(' ')).toContain('dùng dd/mm');
  });

  it('flags a missing required header rather than silently importing', () => {
    const preview = parseDeceasedPersonCsv('ma_so,ho_ten\nNS-01,Nguyễn Văn A');
    expect(preview.invalidRows[0].errors[0]).toContain('Thiếu cột');
    expect(preview.invalidRows[0].rowNumber).toBe(1);
  });
});
