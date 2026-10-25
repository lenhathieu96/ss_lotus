import { FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase, supabaseConfigurationError } from '@data/network/supabase/browser-client';

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

export function normalizeLibraryText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLocaleLowerCase('vi-VN');
}

export function normalizeLibraryQuery(value: string): string {
  return normalizeLibraryText(value).slice(0, 120);
}

export function defaultLibraryTitle(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
}

export function safeDownloadFileName(title: string): string {
  const normalized = title
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function client() {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Thiếu cấu hình Supabase.');
  return supabase;
}

function rowValue(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value) throw new Error('Dữ liệu thư viện không hợp lệ.');
  return value;
}

function toCategory(row: Record<string, unknown>): LibraryCategory {
  return { id: rowValue(row, 'id'), name: rowValue(row, 'name'), position: Number(row.position) };
}

function toDocument(row: Record<string, unknown>): LibraryDocument {
  return {
    id: rowValue(row, 'id'),
    categoryId: rowValue(row, 'category_id'),
    categoryName: rowValue(row, 'category_name'),
    title: rowValue(row, 'title'),
    author: typeof row.author === 'string' ? row.author : null,
    publishedAt: rowValue(row, 'published_at'),
  };
}

function toAdminDocument(row: Record<string, unknown>): LibraryAdminDocument {
  const document = toDocument({ ...row, published_at: row.published_at ?? row.created_at });
  const status = row.status;
  if (status !== 'pending' && status !== 'cleaning' && status !== 'published' && status !== 'deleting') {
    throw new Error('Trạng thái tài liệu không hợp lệ.');
  }
  return {
    ...document,
    originalFilename: rowValue(row, 'original_filename'),
    storagePath: rowValue(row, 'storage_path'),
    status,
    createdByUserId: rowValue(row, 'created_by_user_id'),
    createdAt: rowValue(row, 'created_at'),
    uploadExpiresAt: typeof row.upload_expires_at === 'string' ? row.upload_expires_at : null,
    cleanupClaimUntil: typeof row.cleanup_claim_until === 'string' ? row.cleanup_claim_until : null,
  };
}

function throwRpcError(error: { code?: string; message: string }): never {
  if (error.code === '42501' || error.message.includes('Administrator access required')) throw new Error('Tài khoản không có quyền quản lý thư viện.');
  if (error.code === '23505') throw new Error('Tên danh mục đã tồn tại.');
  if (error.code === '23503') throw new Error('Danh mục đang có tài liệu, không thể xóa.');
  throw new Error(error.message);
}

export async function isLibraryAdmin(): Promise<boolean> {
  // Reuse the established admin capability so dashboard navigation does not
  // depend on the library schema being migrated before its menu can appear.
  const { data, error } = await client().rpc('is_admin');
  if (error) throwRpcError(error);
  return data === true;
}

export async function listLibraryCategories(): Promise<LibraryCategory[]> {
  const { data, error } = await client().rpc('list_library_categories');
  if (error) throwRpcError(error);
  return (data ?? []).map((row: unknown) => toCategory(row as Record<string, unknown>));
}

export async function searchLibraryDocuments(input: {
  query: string;
  categoryId?: string;
  cursor?: LibraryCursor | null;
  limit?: number;
}): Promise<LibraryDocument[]> {
  const { data, error } = await client().rpc('search_library_documents', {
    p_query: input.query.trim().slice(0, 120),
    p_category_id: input.categoryId || null,
    p_cursor_published_at: input.cursor?.publishedAt ?? null,
    p_cursor_id: input.cursor?.id ?? null,
    p_limit: input.limit ?? 24,
  });
  if (error) throwRpcError(error);
  return (data ?? []).map((row: unknown) => toDocument(row as Record<string, unknown>));
}

export async function getLibraryDocument(id: string): Promise<LibraryDocument | null> {
  const { data, error } = await client().rpc('get_library_document', { p_document_id: id });
  if (error) throwRpcError(error);
  const row = Array.isArray(data) ? data[0] : null;
  return row ? toDocument(row as Record<string, unknown>) : null;
}

export async function listLibraryDocumentsAdmin(): Promise<LibraryAdminDocument[]> {
  const { data, error } = await client().rpc('list_library_documents_admin');
  if (error) throwRpcError(error);
  return (data ?? []).map((row: unknown) => toAdminDocument(row as Record<string, unknown>));
}

export async function createLibraryCategory(name: string): Promise<void> {
  const { error } = await client().rpc('create_library_category', { p_name: name });
  if (error) throwRpcError(error);
}

export async function updateLibraryCategory(category: LibraryCategory): Promise<void> {
  const { error } = await client().rpc('update_library_category', {
    p_category_id: category.id,
    p_name: category.name,
    p_position: category.position,
  });
  if (error) throwRpcError(error);
}

export async function reorderLibraryCategories(ids: string[]): Promise<void> {
  const { error } = await client().rpc('reorder_library_categories', { p_category_ids: ids });
  if (error) throwRpcError(error);
}

export async function deleteLibraryCategory(id: string): Promise<void> {
  const { error } = await client().rpc('delete_library_category', { p_category_id: id });
  if (error) throwRpcError(error);
}

export async function updateLibraryDocument(document: Pick<LibraryDocument, 'id' | 'categoryId' | 'title' | 'author'>): Promise<void> {
  const { error } = await client().rpc('update_library_document', {
    p_document_id: document.id,
    p_category_id: document.categoryId,
    p_title: document.title,
    p_author: document.author,
  });
  if (error) throwRpcError(error);
}

export type LibraryUploadRecovery = Readonly<{
  status: 'published' | 'reupload_required' | 'needs_s3_access' | 'pending';
  message?: string;
  capability?: string;
}>;

type LifecycleAction =
  | 'prepare-upload'
  | 'complete-upload'
  | 'resolve-upload'
  | 'recover-upload'
  | 'cancel-upload'
  | 'cleanup-uploads'
  | 'delete-document'
  | 'reconcile-document'
  | 'get-download-url';

async function invokeLifecycle<T>(action: LifecycleAction, payload: Record<string, unknown> = {}): Promise<T> {
  const provider = client();
  const headers: Record<string, string> = {};
  if (action !== 'get-download-url') {
    const { data, error } = await provider.auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const { data, error } = await provider.functions.invoke<T>('library-lifecycle', {
    body: { action, ...payload },
    headers,
  });
  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response;
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    if (response.status === 403) throw new Error('Tài khoản không có quyền quản lý thư viện.');
    if (typeof body?.error === 'string') throw new Error(body.error);
    throw new Error('Không thể xử lý yêu cầu thư viện. Vui lòng thử lại.');
  }
  if (error instanceof FunctionsRelayError) throw new Error('Dịch vụ thư viện tạm thời không khả dụng. Vui lòng thử lại.');
  if (error) throw new Error('Không thể kết nối dịch vụ thư viện. Kiểm tra kết nối và thử lại.');
  return data as T;
}

export async function prepareLibraryUpload(input: {
  categoryId: string;
  title: string;
  author: string;
  file: File;
}): Promise<LibraryUploadTicket> {
  return invokeLifecycle('prepare-upload', {
    categoryId: input.categoryId,
    title: input.title,
    author: input.author,
    originalFilename: input.file.name,
    expectedSize: input.file.size,
  });
}

export async function completeLibraryUpload(documentId: string): Promise<void> {
  await invokeLifecycle('complete-upload', { documentId });
}

export async function resolveLibraryUpload(documentId: string): Promise<{ status: 'published' | 'pending' }> {
  return invokeLifecycle('resolve-upload', { documentId });
}

export async function recoverLibraryUpload(documentId: string): Promise<LibraryUploadRecovery> {
  return invokeLifecycle('recover-upload', { documentId });
}

export async function cancelLibraryUpload(documentId: string): Promise<void> {
  await invokeLifecycle('cancel-upload', { documentId });
}

export async function cleanupLibraryUploads(): Promise<void> {
  await invokeLifecycle('cleanup-uploads');
}

export async function deleteLibraryDocument(documentId: string): Promise<void> {
  await invokeLifecycle('delete-document', { documentId });
}

export async function reconcileLibraryDocument(documentId: string): Promise<void> {
  await invokeLifecycle('reconcile-document', { documentId });
}

export function publicLibraryDocumentUrl(documentId: string): string {
  const base = process.env.NEXT_PUBLIC_S3_LIBRARY_BASE_URL;
  if (!base) throw new Error('Thiếu cấu hình NEXT_PUBLIC_S3_LIBRARY_BASE_URL.');
  const url = new URL(base);
  if (url.protocol !== 'https:') throw new Error('URL thư viện PDF phải dùng HTTPS.');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/documents/${documentId}.pdf`;
  return url.toString();
}

export async function getLibraryDownloadUrl(documentId: string): Promise<string> {
  const result = await invokeLifecycle<{ url: string }>('get-download-url', { documentId });
  try {
    const url = new URL(result.url);
    // The Function signs S3 URLs. Trust neither arbitrary redirects nor a URL for another object.
    const virtualHost = /^[a-z0-9][a-z0-9.-]*\.s3\.[a-z0-9-]+\.amazonaws\.com$/i.test(url.hostname);
    const pathHost = /^s3\.[a-z0-9-]+\.amazonaws\.com$/i.test(url.hostname);
    const expectedKey = `/documents/${documentId}.pdf`;
    const pathMatches = virtualHost
      ? url.pathname === expectedKey
      : pathHost
        && /^\/[^/]+\/documents\//.test(url.pathname)
        && url.pathname.slice(url.pathname.indexOf('/', 1)) === expectedKey;
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !pathMatches) throw new Error();
    return url.toString();
  } catch {
    throw new Error('Đường dẫn tải PDF không hợp lệ. Vui lòng thử lại.');
  }
}

export type LibraryUploadProgress = Readonly<{ uploadedBytes: number; totalBytes: number; percent: number }>;

async function putStagedPdf(
  file: File,
  ticket: LibraryUploadTicket,
  onProgress: (progress: LibraryUploadProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open('PUT', ticket.uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('If-None-Match', '*');
    xhr.upload.onprogress = (event) => {
      const totalBytes = event.total || file.size;
      onProgress({
        uploadedBytes: event.loaded,
        totalBytes,
        percent: Math.floor((event.loaded / (totalBytes || 1)) * 100),
      });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('Staged upload was not accepted.'));
    };
    xhr.onerror = () => reject(new Error('Staged upload outcome is unknown.'));
    xhr.ontimeout = () => reject(new Error('Staged upload outcome is unknown.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}

export async function startLibraryPdfUpload(input: {
  file: File;
  title: string;
  author: string;
  categoryId: string;
  onProgress: (progress: LibraryUploadProgress) => void;
  onPrepared?: (ticket: LibraryUploadTicket) => void;
  signal?: AbortSignal;
}): Promise<LibraryUploadTicket> {
  if (!await hasPdfSignature(input.file)) throw new Error('Tệp không có chữ ký PDF hợp lệ.');
  const ticket = await prepareLibraryUpload(input);
  input.onPrepared?.(ticket);
  try {
    await putStagedPdf(input.file, ticket, input.onProgress, input.signal);
    await completeLibraryUpload(ticket.documentId);
  } catch (cause) {
    const resolved = await resolveLibraryUpload(ticket.documentId).catch(() => ({ status: 'pending' as const }));
    if (resolved.status === 'published') return ticket;
    if (input.signal?.aborted) await cancelLibraryUpload(ticket.documentId).catch(() => undefined);
    throw cause instanceof Error ? cause : new Error('Không thể tải PDF; lượt tải đang được dàn xếp trước khi thử lại.');
  }
  return ticket;
}

export type QueueResult<T, R> = Readonly<{ item: T; status: 'fulfilled'; value: R } | { item: T; status: 'rejected'; reason: unknown }>;

export async function runLibraryUploadQueue<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: (result: QueueResult<T, R>, index: number) => void,
): Promise<Array<QueueResult<T, R>>> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Concurrency must be a positive integer.');
  const results: Array<QueueResult<T, R>> = new Array(items.length);
  let nextIndex = 0;
  async function consume() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      const item = items[index];
      try {
        const result = await worker(item, index);
        const settled: QueueResult<T, R> = { item, status: 'fulfilled', value: result };
        results[index] = settled;
        onSettled?.(settled, index);
      } catch (reason) {
        const settled: QueueResult<T, R> = { item, status: 'rejected', reason };
        results[index] = settled;
        onSettled?.(settled, index);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}
