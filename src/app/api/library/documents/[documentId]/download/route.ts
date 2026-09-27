import { NextRequest } from 'next/server';
import { createDownloadUrl } from '@/lib/s3-server';
import { invokeLibraryLifecycle, requireRpcRow, rpcString } from '@/lib/library-lifecycle-server';
import { LibraryRouteError, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function GET(_request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    requireUuid(documentId, 'Not found.', 404);
    const data = await invokeLibraryLifecycle('get_published_s3_library_document', { p_document_id: documentId });
    const candidate = Array.isArray(data) ? data[0] : data;
    if (!candidate || typeof candidate !== 'object') throw new LibraryRouteError('Not found.', 404);
    const row = requireRpcRow(candidate, 'Not found.');
    const url = await createDownloadUrl(documentId, rpcString(row, 'title'));
    const response = Response.redirect(url, 302);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) { return routeErrorResponse(error); }
}
