import { describe, expect, it } from 'vitest';
import { parseDeceasedPersonCsv } from './deceased-person-import';

const header = 'ma_so,ho_ten,phap_danh,ngay_mat,nguoi_lap,ma_ho,ma_gia_dinh';

describe('parseDeceasedPersonCsv', () => {
  it('parses UTF-8 BOM CSV and normalizes a valid Vietnamese row', () => {
    const preview = parseDeceasedPersonCsv(`\uFEFF${header}\nNS-001,Nguyễn Văn An,Thiện Tâm,2024-01-15,Admin,1,2`);
    expect(preview.invalidRows).toHaveLength(0);
    expect(preview.validRows[0]).toMatchObject({ code: 'NS-001', fullName: 'NGUYỄN VĂN AN', dharmaName: 'THIỆN TÂM' });
  });

  it('reports source-row errors for duplicate codes and invalid required values', () => {
    const preview = parseDeceasedPersonCsv(`${header}\nNS-001,,Tâm,2024-99-01,,1,\nNS-001,Trần B,Phúc,2024-01-10,Admin,2,3`, ['NS-001']);
    expect(preview.validRows).toHaveLength(0);
    expect(preview.invalidRows).toHaveLength(2);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Dòng 2.*Mã số trùng/);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Ngày mất không hợp lệ/);
    expect(preview.invalidRows.flatMap((row) => row.errors).join(' ')).toMatch(/Mã hộ và mã gia đình phải nhập cùng nhau/);
  });

  it('flags a missing required header rather than silently importing', () => {
    const preview = parseDeceasedPersonCsv('ma_so,ho_ten\nNS-01,Nguyễn Văn A');
    expect(preview.invalidRows[0].errors[0]).toContain('Thiếu cột');
    expect(preview.invalidRows[0].rowNumber).toBe(1);
  });
});
