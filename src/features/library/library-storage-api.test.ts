import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession } },
  supabaseConfigurationError: null,
}));

import { libraryDownloadUrl, prepareLibraryS3Upload, publicLibraryDocumentUrl, recoverLibraryS3Upload } from './library-storage-api';

describe('library storage API', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'access-token' } }, error: null });
    process.env.NEXT_PUBLIC_S3_LIBRARY_BASE_URL = 'https://library.example.test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ documentId: 'doc-1', stagingPath: 'pending/doc-1.pdf', uploadUrl: 'https://signed.example.test', expiresAt: '2026-09-27T00:15:00Z' }), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the current Supabase bearer token only to the same-origin ticket route', async () => {
    const file = new File(['%PDF-1.7'], 'book.pdf', { type: 'application/pdf' });
    await expect(prepareLibraryS3Upload({ categoryId: '11111111-1111-4111-8111-111111111111', title: 'Book', author: '', file })).resolves.toMatchObject({ documentId: 'doc-1', stagingPath: 'pending/doc-1.pdf' });
    expect(fetch).toHaveBeenCalledWith('/api/library/uploads', expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer access-token' }) }));
  });

  it('builds preview and signed-download routes without a storage-management URL', () => {
    expect(publicLibraryDocumentUrl('doc-1')).toBe('https://library.example.test/documents/doc-1.pdf');
    expect(libraryDownloadUrl('doc-1')).toBe('/api/library/documents/doc-1/download');
  });

  it('uses the authenticated recovery route for a stalled upload', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ status: 'needs_s3_access', capability: 'read_staging', message: 'S3 từ chối đọc file chờ xử lý.' }), { status: 200 }));
    await expect(recoverLibraryS3Upload('doc-1')).resolves.toMatchObject({ status: 'needs_s3_access', capability: 'read_staging' });
    expect(fetch).toHaveBeenCalledWith('/api/library/uploads/doc-1/recover', expect.objectContaining({ method: 'POST' }));
  });
});
