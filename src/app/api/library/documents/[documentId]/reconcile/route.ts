import { NextRequest } from 'next/server';
import { headObject, s3LibraryKeys } from '@/lib/s3-server';
import { invokeLibraryLifecycle } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    const object = await headObject(s3LibraryKeys.documentKey(documentId));
    await invokeLibraryLifecycle(object ? 'restore_s3_library_document_delete' : 'complete_s3_library_document_delete', {
      p_actor_id: admin.userId, p_document_id: documentId,
    });
    return Response.json({ status: object ? 'published' : 'deleted' });
  } catch (error) { return routeErrorResponse(error); }
}
