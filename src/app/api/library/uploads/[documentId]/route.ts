import { NextRequest } from 'next/server';
import { invokeLibraryLifecycle } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function DELETE(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    await invokeLibraryLifecycle('mark_s3_library_upload_cleaning', { p_actor_id: admin.userId, p_document_id: documentId });
    return Response.json({ status: 'cleaning' });
  } catch (error) { return routeErrorResponse(error); }
}
