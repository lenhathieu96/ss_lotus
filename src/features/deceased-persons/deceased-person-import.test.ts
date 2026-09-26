import { describe, expect, it } from 'vitest';
import { parseDeceasedPersonCsv } from './deceased-person-import';

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
