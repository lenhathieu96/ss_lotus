import 'server-only';

import {
  createDownloadUrl,
  createStagingUploadUrl,
  copyStagingToDocument,
  deleteObjectAndVerify,
  headObject,
  isS3AccessDenied,
  s3LibraryKeys,
  verifyFinalPdf,
  verifyStagingPdf,
} from '@/lib/s3-server';
import { invokeLibraryLifecycle, requireRpcRow, rpcNumber, rpcString } from '@/lib/library-lifecycle-server';
import { libraryServerLifecycleConfig } from './config';
import type {
  LibraryS3AccessCapability,
  LibraryServerLifecycleSource,
  LibraryUploadPreparation,
  LibraryUploadRecovery,
  LibraryUploadSettlement,
  PreparedLibraryUpload,
} from './interface';

function s3AccessRequired(capability: LibraryS3AccessCapability): Extract<LibraryUploadRecovery, { status: 'needs_s3_access' }> {
  const messages: Record<LibraryS3AccessCapability, string> = {
    read_staging: 'S3 từ chối đọc file chờ xử lý. Kiểm tra s3:GetObject và quyền KMS nếu bucket dùng SSE-KMS.',
    write_document: 'S3 từ chối tạo bản PDF công khai. Kiểm tra s3:PutObject trên documents/*. ',
    delete_staging: 'S3 từ chối dọn file chờ xử lý. Kiểm tra s3:DeleteObject trên pending/*. ',
    delete_document: 'S3 từ chối dọn bản PDF công khai. Kiểm tra s3:DeleteObject trên documents/*. ',
  };
  return { status: 'needs_s3_access', capability, message: messages[capability] };
}

async function completeUpload(documentId: string, actorId: string): Promise<LibraryUploadSettlement> {
  const ticket = requireRpcRow(await invokeLibraryLifecycle('claim_s3_library_upload_completion', {
    p_actor_id: actorId, p_document_id: documentId,
  }), 'Upload ticket not found.');
  if (rpcString(ticket, 'status') === 'published') return { status: 'published' };

  const claimToken = rpcString(ticket, 'completion_claim_token');
  const expectedSize = rpcNumber(ticket, 'expected_size');
  let staged;
  try { staged = await verifyStagingPdf(documentId, expectedSize); }
  catch { staged = await verifyFinalPdf(documentId, expectedSize); }
  const final = await copyStagingToDocument(documentId);
  if (final.size !== staged.size) throw new Error('The copied PDF size does not match the staged PDF.');
  await verifyFinalPdf(documentId, expectedSize);
  await deleteObjectAndVerify(s3LibraryKeys.stagingKey(documentId));
  await invokeLibraryLifecycle('complete_s3_library_upload', {
    p_actor_id: actorId,
    p_document_id: documentId,
    p_completion_claim_token: claimToken,
    p_observed_size: staged.size,
    p_observed_content_type: staged.contentType,
    p_observed_etag: staged.etag,
  });
  return { status: 'published' };
}

export const libraryS3LifecycleSource: LibraryServerLifecycleSource = {
  async prepareUpload(input: LibraryUploadPreparation): Promise<PreparedLibraryUpload> {
    const row = requireRpcRow(await invokeLibraryLifecycle('prepare_s3_library_upload', {
      p_actor_id: input.actorId,
      p_category_id: input.categoryId,
      p_title: input.title,
      p_author: input.author,
      p_original_filename: input.originalFilename,
      p_expected_size: input.expectedSize,
    }), 'Could not create an upload ticket.');
    const documentId = rpcString(row, 'document_id');
    return { documentId, expiresAt: rpcString(row, 'upload_expires_at'), ...await createStagingUploadUrl(documentId) };
  },

  completeUpload,

  async resolveUpload(documentId, actorId) {
    const ticket = requireRpcRow(await invokeLibraryLifecycle('get_s3_library_upload_ticket', {
      p_actor_id: actorId, p_document_id: documentId,
    }), 'Upload ticket not found.');
    if (rpcString(ticket, 'status') === 'published') return { status: 'published' };
    try { return await completeUpload(documentId, actorId); }
    catch { return { status: 'pending', message: 'Upload settlement remains pending.' }; }
  },

  async recoverUpload(documentId, actorId) {
    const ticket = requireRpcRow(await invokeLibraryLifecycle('get_s3_library_upload_ticket', {
      p_actor_id: actorId, p_document_id: documentId,
    }), 'Upload ticket not found.');
    const status = rpcString(ticket, 'status');
    if (status === 'pending') {
      try { return await completeUpload(documentId, actorId); }
      catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('read_staging'); throw error; }
    }
    if (status !== 'cleaning') return { status: 'pending', message: 'Lượt tải chưa thể dàn xếp ở trạng thái hiện tại.' };

    const recovery = requireRpcRow(await invokeLibraryLifecycle('claim_s3_library_upload_recovery', {
      p_actor_id: actorId, p_document_id: documentId,
    }), 'Không thể lấy lượt tải để dàn xếp.');
    const expectedSize = rpcNumber(recovery, 'expected_size');
    const claimToken = rpcString(recovery, 'recovery_claim_token');
    const stagingKey = s3LibraryKeys.stagingKey(documentId);
    let staging;
    try { staging = await headObject(stagingKey); }
    catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('read_staging'); throw error; }

    if (!staging) {
      try { await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId)); }
      catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('delete_document'); throw error; }
      await invokeLibraryLifecycle('finish_s3_library_upload_cleanup', {
        p_actor_id: actorId, p_document_id: documentId, p_claim_token: claimToken,
      });
      return { status: 'reupload_required', message: 'File chờ xử lý không còn trên S3. Lượt tải đã được dọn; vui lòng tải lại PDF.' };
    }

    let verified;
    try { verified = await verifyStagingPdf(documentId, expectedSize); }
    catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('read_staging'); throw error; }
    try { await copyStagingToDocument(documentId); await verifyFinalPdf(documentId, expectedSize); }
    catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('write_document'); throw error; }
    try { await deleteObjectAndVerify(stagingKey); }
    catch (error) { if (isS3AccessDenied(error)) return s3AccessRequired('delete_staging'); throw error; }
    await invokeLibraryLifecycle('publish_recovered_s3_library_upload', {
      p_actor_id: actorId,
      p_document_id: documentId,
      p_recovery_claim_token: claimToken,
      p_observed_size: verified.size,
      p_observed_content_type: verified.contentType,
      p_observed_etag: verified.etag,
    });
    return { status: 'published', message: 'Đã xác minh và công khai PDF đang chờ xử lý.' };
  },

  async cancelUpload(documentId, actorId) {
    await invokeLibraryLifecycle('mark_s3_library_upload_cleaning', { p_actor_id: actorId, p_document_id: documentId });
  },

  async cleanupExpiredUploads(actorId) {
    const rows = await invokeLibraryLifecycle('claim_expired_s3_library_uploads', {
      p_actor_id: actorId, p_limit: libraryServerLifecycleConfig.cleanupBatchSize,
    });
    const tickets = Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
    for (const ticket of tickets) {
      const documentId = typeof ticket.document_id === 'string' ? ticket.document_id : '';
      const claimToken = typeof ticket.cleanup_claim_token === 'string' ? ticket.cleanup_claim_token : '';
      if (!documentId || !claimToken) continue;
      await deleteObjectAndVerify(s3LibraryKeys.stagingKey(documentId));
      await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId));
      await invokeLibraryLifecycle('finish_s3_library_upload_cleanup', {
        p_actor_id: actorId, p_document_id: documentId, p_claim_token: claimToken,
      });
    }
    return tickets.length;
  },

  async deleteDocument(documentId, actorId) {
    await invokeLibraryLifecycle('begin_s3_library_document_delete', { p_actor_id: actorId, p_document_id: documentId });
    await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId));
    await invokeLibraryLifecycle('complete_s3_library_document_delete', { p_actor_id: actorId, p_document_id: documentId });
  },

  async reconcileDocument(documentId, actorId) {
    const object = await headObject(s3LibraryKeys.documentKey(documentId));
    await invokeLibraryLifecycle(object ? 'restore_s3_library_document_delete' : 'complete_s3_library_document_delete', {
      p_actor_id: actorId, p_document_id: documentId,
    });
    return object ? 'published' : 'deleted';
  },

  async getDownloadUrl(documentId) {
    const data = await invokeLibraryLifecycle('get_published_s3_library_document', { p_document_id: documentId });
    const candidate = Array.isArray(data) ? data[0] : data;
    if (!candidate || typeof candidate !== 'object') return null;
    const row = requireRpcRow(candidate, 'Not found.');
    return createDownloadUrl(documentId, rpcString(row, 'title'));
  },
};
