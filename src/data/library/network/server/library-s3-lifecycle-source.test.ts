import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  createStagingUploadUrl: vi.fn(),
  createDownloadUrl: vi.fn(),
  copyStagingToDocument: vi.fn(),
  deleteObjectAndVerify: vi.fn(),
  headObject: vi.fn(),
  isS3AccessDenied: vi.fn(),
  verifyFinalPdf: vi.fn(),
  verifyStagingPdf: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/data/remote/supabase/library-lifecycle-source', () => ({
  invokeLibraryLifecycle: mocks.invoke,
  requireRpcRow: (data: unknown, message: string) => {
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== 'object') throw new Error(message);
    return row as Record<string, unknown>;
  },
  rpcString: (row: Record<string, unknown>, key: string) => {
    if (typeof row[key] !== 'string' || !row[key]) throw new Error(`Invalid lifecycle response: ${key}`);
    return row[key];
  },
  rpcNumber: (row: Record<string, unknown>, key: string) => {
    if (typeof row[key] !== 'number') throw new Error(`Invalid lifecycle response: ${key}`);
    return row[key];
  },
}));
vi.mock('@/data/remote/s3/library-storage-source', () => ({
  createStagingUploadUrl: mocks.createStagingUploadUrl,
  createDownloadUrl: mocks.createDownloadUrl,
  copyStagingToDocument: mocks.copyStagingToDocument,
  deleteObjectAndVerify: mocks.deleteObjectAndVerify,
  headObject: mocks.headObject,
  isS3AccessDenied: mocks.isS3AccessDenied,
  verifyFinalPdf: mocks.verifyFinalPdf,
  verifyStagingPdf: mocks.verifyStagingPdf,
  s3LibraryKeys: {
    documentKey: (documentId: string) => `documents/${documentId}.pdf`,
    stagingKey: (documentId: string) => `pending/${documentId}.pdf`,
  },
}));

import { libraryS3LifecycleSource } from './library-s3-lifecycle-source';

const actorId = 'actor-1';
const documentId = 'document-1';
const pdf = { size: 42, contentType: 'application/pdf', etag: 'etag-1' };

describe('library S3 lifecycle source', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.isS3AccessDenied.mockImplementation((error: unknown) => (
      typeof error === 'object' && error !== null && (error as { code?: number }).code === 403
    ));
  });

  it('prepares a ticket before issuing its private staging upload capability', async () => {
    mocks.invoke.mockResolvedValue({ document_id: documentId, upload_expires_at: '2026-10-24T00:15:00Z' });
    mocks.createStagingUploadUrl.mockResolvedValue({ stagingPath: 'pending/document-1.pdf', uploadUrl: 'https://upload.test', expiresInSeconds: 900 });

    await expect(libraryS3LifecycleSource.prepareUpload({
      actorId, categoryId: 'category-1', title: 'Kinh', author: null, originalFilename: 'kinh.pdf', expectedSize: 42,
    })).resolves.toEqual({
      documentId, expiresAt: '2026-10-24T00:15:00Z', stagingPath: 'pending/document-1.pdf', uploadUrl: 'https://upload.test', expiresInSeconds: 900,
    });
    expect(mocks.invoke).toHaveBeenCalledWith('prepare_s3_library_upload', expect.objectContaining({ p_actor_id: actorId, p_expected_size: 42 }));
    expect(mocks.createStagingUploadUrl).toHaveBeenCalledWith(documentId);
  });

  it('treats an already published completion ticket as an idempotent no-op', async () => {
    mocks.invoke.mockResolvedValue({ status: 'published', expected_size: 42, completion_claim_token: null });

    await expect(libraryS3LifecycleSource.completeUpload(documentId, actorId)).resolves.toEqual({ status: 'published' });
    expect(mocks.copyStagingToDocument).not.toHaveBeenCalled();
    expect(mocks.deleteObjectAndVerify).not.toHaveBeenCalled();
  });

  it('falls back to the final PDF after an interrupted copy, then finalizes the completion claim', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ status: 'pending', expected_size: 42, completion_claim_token: 'completion-claim' })
      .mockResolvedValueOnce(undefined);
    mocks.verifyStagingPdf.mockRejectedValue(new Error('staging object missing'));
    mocks.verifyFinalPdf.mockResolvedValue(pdf);
    mocks.copyStagingToDocument.mockResolvedValue(pdf);

    await expect(libraryS3LifecycleSource.completeUpload(documentId, actorId)).resolves.toEqual({ status: 'published' });
    expect(mocks.deleteObjectAndVerify).toHaveBeenCalledWith('pending/document-1.pdf');
    expect(mocks.invoke).toHaveBeenLastCalledWith('complete_s3_library_upload', expect.objectContaining({
      p_completion_claim_token: 'completion-claim', p_observed_size: 42, p_observed_etag: 'etag-1',
    }));
  });

  it('recovers a cleaning ticket with missing staging data by deleting the final object and finishing cleanup', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ status: 'cleaning' })
      .mockResolvedValueOnce({ expected_size: 42, recovery_claim_token: 'recovery-claim' })
      .mockResolvedValueOnce(undefined);
    mocks.headObject.mockResolvedValue(null);

    await expect(libraryS3LifecycleSource.recoverUpload(documentId, actorId)).resolves.toMatchObject({ status: 'reupload_required' });
    expect(mocks.deleteObjectAndVerify).toHaveBeenCalledWith('documents/document-1.pdf');
    expect(mocks.invoke).toHaveBeenLastCalledWith('finish_s3_library_upload_cleanup', expect.objectContaining({ p_claim_token: 'recovery-claim' }));
  });

  it('reports the existing write capability outcome when recovery cannot copy the public document', async () => {
    mocks.invoke
      .mockResolvedValueOnce({ status: 'cleaning' })
      .mockResolvedValueOnce({ expected_size: 42, recovery_claim_token: 'recovery-claim' });
    mocks.headObject.mockResolvedValue(pdf);
    mocks.verifyStagingPdf.mockResolvedValue(pdf);
    mocks.copyStagingToDocument.mockRejectedValue({ code: 403 });

    await expect(libraryS3LifecycleSource.recoverUpload(documentId, actorId)).resolves.toMatchObject({
      status: 'needs_s3_access', capability: 'write_document',
    });
    expect(mocks.deleteObjectAndVerify).not.toHaveBeenCalled();
  });

  it('leaves a document deleting when its S3 object cannot be removed', async () => {
    mocks.invoke.mockResolvedValueOnce(undefined);
    mocks.deleteObjectAndVerify.mockRejectedValue(new Error('S3 unavailable'));

    await expect(libraryS3LifecycleSource.deleteDocument(documentId, actorId)).rejects.toThrow('S3 unavailable');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith('begin_s3_library_document_delete', expect.any(Object));
  });
});
