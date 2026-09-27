import { NextRequest } from 'next/server';
import { copyStagingToDocument, deleteObjectAndVerify, verifyFinalPdf, verifyStagingPdf, s3LibraryKeys } from '@/lib/s3-server';
import { invokeLibraryLifecycle, requireRpcRow, rpcNumber, rpcString } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

async function complete(documentId: string, actorId: string) {
  const ticket = requireRpcRow(await invokeLibraryLifecycle('claim_s3_library_upload_completion', { p_actor_id: actorId, p_document_id: documentId }), 'Upload ticket not found.');
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
    p_actor_id: actorId, p_document_id: documentId, p_completion_claim_token: claimToken, p_observed_size: staged.size,
    p_observed_content_type: staged.contentType, p_observed_etag: staged.etag,
  });
  return { status: 'published' };
}

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    return Response.json(await complete(documentId, admin.userId));
  } catch (error) { return routeErrorResponse(error); }
}

export { complete as completeLibraryUpload };
