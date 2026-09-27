import { NextRequest } from 'next/server';
import { completeLibraryUpload } from '../complete/route';
import { invokeLibraryLifecycle, requireRpcRow, rpcNumber, rpcString } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';
import { copyStagingToDocument, deleteObjectAndVerify, headObject, isS3AccessDenied, s3LibraryKeys, verifyFinalPdf, verifyStagingPdf } from '@/lib/s3-server';

type RecoveryCapability = 'read_staging' | 'write_document' | 'delete_staging' | 'delete_document';

function needsS3Access(capability: RecoveryCapability) {
  const message: Record<RecoveryCapability, string> = {
    read_staging: 'S3 từ chối đọc file chờ xử lý. Kiểm tra s3:GetObject và quyền KMS nếu bucket dùng SSE-KMS.',
    write_document: 'S3 từ chối tạo bản PDF công khai. Kiểm tra s3:PutObject trên documents/*. ',
    delete_staging: 'S3 từ chối dọn file chờ xử lý. Kiểm tra s3:DeleteObject trên pending/*. ',
    delete_document: 'S3 từ chối dọn bản PDF công khai. Kiểm tra s3:DeleteObject trên documents/*. ',
  };
  return Response.json({ status: 'needs_s3_access', capability, message: message[capability] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    const ticket = requireRpcRow(await invokeLibraryLifecycle('get_s3_library_upload_ticket', { p_actor_id: admin.userId, p_document_id: documentId }), 'Upload ticket not found.');
    const status = rpcString(ticket, 'status');

    if (status === 'pending') {
      try { return Response.json(await completeLibraryUpload(documentId, admin.userId)); }
      catch (error) { if (isS3AccessDenied(error)) return needsS3Access('read_staging'); throw error; }
    }
    if (status !== 'cleaning') return Response.json({ status: 'pending', message: 'Lượt tải chưa thể dàn xếp ở trạng thái hiện tại.' });

    const recovery = requireRpcRow(await invokeLibraryLifecycle('claim_s3_library_upload_recovery', { p_actor_id: admin.userId, p_document_id: documentId }), 'Không thể lấy lượt tải để dàn xếp.');
    const expectedSize = rpcNumber(recovery, 'expected_size');
    const claimToken = rpcString(recovery, 'recovery_claim_token');
    const stagingKey = s3LibraryKeys.stagingKey(documentId);
    let staging;
    try { staging = await headObject(stagingKey); }
    catch (error) { if (isS3AccessDenied(error)) return needsS3Access('read_staging'); throw error; }

    if (!staging) {
      try { await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId)); }
      catch (error) { if (isS3AccessDenied(error)) return needsS3Access('delete_document'); throw error; }
      await invokeLibraryLifecycle('finish_s3_library_upload_cleanup', { p_actor_id: admin.userId, p_document_id: documentId, p_claim_token: claimToken });
      return Response.json({ status: 'reupload_required', message: 'File chờ xử lý không còn trên S3. Lượt tải đã được dọn; vui lòng tải lại PDF.' });
    }

    let verified;
    try { verified = await verifyStagingPdf(documentId, expectedSize); }
    catch (error) { if (isS3AccessDenied(error)) return needsS3Access('read_staging'); throw error; }
    try { await copyStagingToDocument(documentId); await verifyFinalPdf(documentId, expectedSize); }
    catch (error) { if (isS3AccessDenied(error)) return needsS3Access('write_document'); throw error; }
    try { await deleteObjectAndVerify(stagingKey); }
    catch (error) { if (isS3AccessDenied(error)) return needsS3Access('delete_staging'); throw error; }
    await invokeLibraryLifecycle('publish_recovered_s3_library_upload', {
      p_actor_id: admin.userId, p_document_id: documentId, p_recovery_claim_token: claimToken,
      p_observed_size: verified.size, p_observed_content_type: verified.contentType, p_observed_etag: verified.etag,
    });
    return Response.json({ status: 'published', message: 'Đã xác minh và công khai PDF đang chờ xử lý.' });
  } catch (error) { return routeErrorResponse(error); }
}
