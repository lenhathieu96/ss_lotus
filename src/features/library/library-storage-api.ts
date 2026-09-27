import { supabase, supabaseConfigurationError } from '@/lib/supabase';
import { LibraryUploadTicket } from './library-domain';

async function accessToken(): Promise<string> {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Thiếu cấu hình Supabase.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  return data.session.access_token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken()}`, ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
  });
  const body = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(body.error ?? 'Không thể xử lý yêu cầu thư viện.');
  return body;
}

export async function prepareLibraryS3Upload(input: { categoryId: string; title: string; author: string; file: File }): Promise<LibraryUploadTicket> {
  const result = await request<{ documentId: string; stagingPath: string; uploadUrl: string; expiresAt: string }>('/api/library/uploads', {
    method: 'POST', body: JSON.stringify({ categoryId: input.categoryId, title: input.title, author: input.author, originalFilename: input.file.name, expectedSize: input.file.size }),
  });
  return result;
}

export async function completeLibraryS3Upload(documentId: string): Promise<void> { await request(`/api/library/uploads/${documentId}/complete`, { method: 'POST', body: '{}' }); }
export async function resolveLibraryS3Upload(documentId: string): Promise<{ status: 'published' | 'pending' }> { return request(`/api/library/uploads/${documentId}/resolve`, { method: 'POST', body: '{}' }); }
export type LibraryUploadRecovery = Readonly<{ status: 'published' | 'reupload_required' | 'needs_s3_access' | 'pending'; message?: string; capability?: string }>;
export async function recoverLibraryS3Upload(documentId: string): Promise<LibraryUploadRecovery> { return request(`/api/library/uploads/${documentId}/recover`, { method: 'POST', body: '{}' }); }
export async function cancelLibraryS3Upload(documentId: string): Promise<void> { await request(`/api/library/uploads/${documentId}`, { method: 'DELETE' }); }
export async function cleanupLibraryS3Uploads(): Promise<void> { await request('/api/library/maintenance/cleanup', { method: 'POST', body: '{}' }); }
export async function deleteLibraryS3Document(documentId: string): Promise<void> { await request(`/api/library/documents/${documentId}/delete`, { method: 'DELETE' }); }
export async function reconcileLibraryS3Document(documentId: string): Promise<void> { await request(`/api/library/documents/${documentId}/reconcile`, { method: 'POST', body: '{}' }); }

export function publicLibraryDocumentUrl(documentId: string): string {
  const configured = process.env.NEXT_PUBLIC_S3_LIBRARY_BASE_URL;
  if (!configured) throw new Error('Thiếu cấu hình NEXT_PUBLIC_S3_LIBRARY_BASE_URL.');
  const url = new URL(configured);
  if (url.protocol !== 'https:') throw new Error('URL thư viện PDF phải dùng HTTPS.');
  url.pathname = `${url.pathname.replace(/\/$/, '')}/documents/${documentId}.pdf`;
  return url.toString();
}

export function libraryDownloadUrl(documentId: string): string { return `/api/library/documents/${documentId}/download`; }
