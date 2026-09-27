import { describe, expect, it } from 'vitest';
import { LIBRARY_MAX_PDF_BYTES, defaultLibraryTitle, hasPdfSignature, normalizeLibraryQuery, safeDownloadFileName, toLibraryPage, validatePdfMetadata } from './library-domain';

describe('library domain', () => {
  it('normalizes Vietnamese search text and derives an editable title from the filename', () => {
    expect(normalizeLibraryQuery('  Đạo Phật  ')).toBe('dao phat');
    expect(defaultLibraryTitle('dao-phat_can-ban.PDF')).toBe('dao phat can ban');
  });

  it('sanitizes a suggested download filename without using the stored filename', () => {
    expect(safeDownloadFileName('Sách: Đạo Phật?')).toBe('Sách Đạo Phật.pdf');
  });

  it('validates PDF metadata and the 100 MB upload limit', () => {
    const file = new File(['%PDF-1.7'], 'book.pdf', { type: 'application/pdf', lastModified: 10 });
    expect(validatePdfMetadata({ title: 'Sách', author: '', categoryId: 'c1', file })).toBeNull();
    expect(validatePdfMetadata({ title: ' ', author: '', categoryId: 'c1', file })).toContain('tên tài liệu');
    const oversized = new File([new Uint8Array(LIBRARY_MAX_PDF_BYTES + 1)], 'large.pdf', { type: 'application/pdf' });
    expect(validatePdfMetadata({ title: 'Sách', author: '', categoryId: 'c1', file: oversized })).toContain('100 MB');
  });

  it('checks the PDF signature', async () => {
    const file = new File(['%PDF-1.7'], 'book.pdf', { type: 'application/pdf', lastModified: 10 });
    expect(await hasPdfSignature(file)).toBe(true);
  });

  it('provides a next cursor only when another page exists', () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ id: `d${index}`, categoryId: 'c1', categoryName: 'Sử học', title: `Sách ${index}`, author: null, publishedAt: `2026-01-0${3-index}` }));
    expect(toLibraryPage(rows, 2).nextCursor?.id).toBe('d1');
    expect(toLibraryPage(rows.slice(0, 2), 2).nextCursor).toBeNull();
  });
});
