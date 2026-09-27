import { NextRequest } from 'next/server';
import { deleteObjectAndVerify, s3LibraryKeys } from '@/lib/s3-server';
import { invokeLibraryLifecycle } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, routeErrorResponse } from '@/lib/library-server-auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLibraryAdmin(request);
    const rows = await invokeLibraryLifecycle('claim_expired_s3_library_uploads', { p_actor_id: admin.userId, p_limit: 20 });
    const tickets = Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
    for (const ticket of tickets) {
      const documentId = typeof ticket.document_id === 'string' ? ticket.document_id : '';
      const claimToken = typeof ticket.cleanup_claim_token === 'string' ? ticket.cleanup_claim_token : '';
      if (!documentId || !claimToken) continue;
      await deleteObjectAndVerify(s3LibraryKeys.stagingKey(documentId));
      await deleteObjectAndVerify(s3LibraryKeys.documentKey(documentId));
      await invokeLibraryLifecycle('finish_s3_library_upload_cleanup', { p_actor_id: admin.userId, p_document_id: documentId, p_claim_token: claimToken });
    }
    return Response.json({ cleaned: tickets.length });
  } catch (error) { return routeErrorResponse(error); }
}
