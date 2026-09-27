import { NextRequest } from 'next/server';
import { deleteObjectAndVerify, s3LibraryKeys } from '@/lib/s3-server';
import { invokeLibraryLifecycle } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function DELETE(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    await invokeLibraryLifecycle('begin_s3_library_document_delete', { p_actor_id: admin.userId, p_document_id: documentId });
    await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId));
    await invokeLibraryLifecycle('complete_s3_library_document_delete', { p_actor_id: admin.userId, p_document_id: documentId });
    return Response.json({ status: 'deleted' });
  } catch (error) { return routeErrorResponse(error); }
}
