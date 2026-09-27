export const LIBRARY_PAGE_SIZE = 24;
export const LIBRARY_MAX_PDF_BYTES = 100 * 1024 * 1024;

export type LibraryCategory = Readonly<{ id: string; name: string; position: number }>;
export type LibraryDocument = Readonly<{
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  author: string | null;
  publishedAt: string;
}>;
export type LibraryCursor = Readonly<{ publishedAt: string; id: string }>;
export type LibraryPage = Readonly<{ documents: LibraryDocument[]; nextCursor: LibraryCursor | null }>;
export type LibraryAdminDocument = LibraryDocument & Readonly<{
  originalFilename: string;
  storagePath: string;
  status: 'pending' | 'cleaning' | 'published' | 'deleting';
  createdByUserId: string;
  createdAt: string;
  uploadExpiresAt: string | null;
  cleanupClaimUntil: string | null;
}>;
export type LibraryUploadTicket = Readonly<{
  documentId: string;
  stagingPath: string;
  uploadUrl: string;
  expiresAt: string;
}>;

export function normalizeLibraryQuery(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLocaleLowerCase('vi-VN').slice(0, 120);
}

export function defaultLibraryTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
}

export function safeDownloadFileName(title: string): string {
  const normalized = title.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${(normalized || 'tai-lieu').slice(0, 160)}.pdf`;
}

export function validatePdfMetadata(input: { title: string; author: string; categoryId: string; file: File }): string | null {
  if (!input.categoryId) return 'Vui lòng chọn danh mục.';
  if (!input.title.trim()) return 'Vui lòng nhập tên tài liệu.';
  if (!input.file.name.toLocaleLowerCase('vi-VN').endsWith('.pdf')) return 'Chỉ nhận tệp PDF.';
  if (input.file.type && input.file.type !== 'application/pdf') return 'Định dạng tệp không phải PDF.';
  if (input.file.size < 1 || input.file.size > LIBRARY_MAX_PDF_BYTES) return 'PDF phải có dung lượng tối đa 100 MB.';
  return null;
}

export async function hasPdfSignature(file: File): Promise<boolean> {
  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return signature.length === 5 && String.fromCharCode(...signature) === '%PDF-';
}

export function toLibraryPage(rows: LibraryDocument[], pageSize: number): LibraryPage {
  const documents = rows.slice(0, pageSize);
  const last = documents.at(-1);
  return { documents, nextCursor: rows.length > pageSize && last ? { publishedAt: last.publishedAt, id: last.id } : null };
}
