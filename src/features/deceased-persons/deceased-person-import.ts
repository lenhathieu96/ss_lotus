import { DeceasedPerson, normalizeDeceasedPerson } from './deceased-person-domain';

export const deceasedPersonCsvHeaders = ['ma_so', 'ho_ten', 'phap_danh', 'ngay_mat', 'nguoi_lap', 'ma_ho', 'ma_gia_dinh'] as const;
type Header = typeof deceasedPersonCsvHeaders[number];
export interface ImportRow { rowNumber: number; person?: DeceasedPerson; errors: string[]; }
export interface ImportPreview { rows: ImportRow[]; validRows: DeceasedPerson[]; invalidRows: ImportRow[]; }

function csvCells(line: string): string[] {
  const cells: string[] = []; let cell = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { cell += char; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
    else cell += char;
  }
  cells.push(cell.trim()); return cells;
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseDeceasedPersonCsv(content: string, existingCodes: string[] = []): ImportPreview {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const headers = csvCells(lines[0] ?? '');
  const missing = deceasedPersonCsvHeaders.filter((header) => !headers.includes(header));
  if (missing.length) { const row = { rowNumber: 1, errors: [`Dòng 1: Thiếu cột ${missing.join(', ')}.`] }; return { rows: [row], validRows: [], invalidRows: [row] }; }
  const seen = new Set(existingCodes.map((code) => code.trim().toLocaleUpperCase('vi-VN')));
  const rows = lines.slice(1).map((line, index) => {
    const values = csvCells(line); const source = Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ''])) as Record<Header, string>;
    const person = normalizeDeceasedPerson({ code: source.ma_so, fullName: source.ho_ten, dharmaName: source.phap_danh, dateOfDeath: source.ngay_mat, createdBy: source.nguoi_lap, householdReference: source.ma_ho, familyReference: source.ma_gia_dinh });
    const rowNumber = index + 2; const errors: string[] = [];
    if (!person.code) errors.push(`Dòng ${rowNumber}: Mã số là bắt buộc.`); else if (seen.has(person.code)) errors.push(`Dòng ${rowNumber}: Mã số trùng: ${person.code}.`); else seen.add(person.code);
    if (!person.fullName) errors.push(`Dòng ${rowNumber}: Họ tên là bắt buộc.`);
    if (!person.dateOfDeath || !validDate(person.dateOfDeath)) errors.push(`Dòng ${rowNumber}: Ngày mất không hợp lệ.`);
    if (!person.createdBy) errors.push(`Dòng ${rowNumber}: Người lập là bắt buộc.`);
    if (person.householdReference && !/^\d{1,4}$/.test(person.householdReference)) errors.push(`Dòng ${rowNumber}: Mã hộ phải từ 1 đến 4 chữ số.`);
    if (person.familyReference && !/^\d{1,4}$/.test(person.familyReference)) errors.push(`Dòng ${rowNumber}: Mã gia đình phải từ 1 đến 4 chữ số.`);
    if (!!person.householdReference !== !!person.familyReference) errors.push(`Dòng ${rowNumber}: Mã hộ và mã gia đình phải nhập cùng nhau.`);
    return { rowNumber, person, errors };
  });
  return { rows, validRows: rows.filter((row) => !row.errors.length).map((row) => row.person!), invalidRows: rows.filter((row) => row.errors.length) };
}
