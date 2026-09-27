import { supabase, supabaseConfigurationError } from '@/lib/supabase';
import { LibraryAdminDocument, LibraryCategory, LibraryCursor, LibraryDocument } from './library-domain';

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
  if (status !== 'pending' && status !== 'cleaning' && status !== 'published' && status !== 'deleting') throw new Error('Trạng thái tài liệu không hợp lệ.');
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

export async function searchLibraryDocuments(input: { query: string; categoryId?: string; cursor?: LibraryCursor | null; limit?: number }): Promise<LibraryDocument[]> {
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
  const { error } = await client().rpc('update_library_category', { p_category_id: category.id, p_name: category.name, p_position: category.position });
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
    p_document_id: document.id, p_category_id: document.categoryId, p_title: document.title, p_author: document.author,
  });
  if (error) throwRpcError(error);
}
