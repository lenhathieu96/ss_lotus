import { NextRequest } from 'next/server';
import { getLibraryServerLifecycleSource } from '@/features/library/data/network/server/source';
import { LibraryRouteError, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function GET(_request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const { documentId } = await context.params;
    requireUuid(documentId, 'Not found.', 404);
    const url = await getLibraryServerLifecycleSource().getDownloadUrl(documentId);
    if (!url) throw new LibraryRouteError('Not found.', 404);
    const response = Response.redirect(url, 302);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) { return routeErrorResponse(error); }
}
