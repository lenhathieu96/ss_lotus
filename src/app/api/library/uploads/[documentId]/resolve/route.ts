import { NextRequest } from 'next/server';
import { completeLibraryUpload } from '../complete/route';
import { invokeLibraryLifecycle, requireRpcRow, rpcString } from '@/lib/library-lifecycle-server';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    const ticket = requireRpcRow(await invokeLibraryLifecycle('get_s3_library_upload_ticket', { p_actor_id: admin.userId, p_document_id: documentId }), 'Upload ticket not found.');
    if (rpcString(ticket, 'status') === 'published') return Response.json({ status: 'published' });
    try { return Response.json(await completeLibraryUpload(documentId, admin.userId)); }
    catch { return Response.json({ status: 'pending', message: 'Upload settlement remains pending.' }); }
  } catch (error) { return routeErrorResponse(error); }
}
