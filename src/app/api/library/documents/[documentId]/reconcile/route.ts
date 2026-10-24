import { NextRequest } from 'next/server';
import { getLibraryServerLifecycleSource } from '@/data/library/network/server/source';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function POST(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    return Response.json({ status: await getLibraryServerLifecycleSource().reconcileDocument(documentId, admin.userId) });
  } catch (error) { return routeErrorResponse(error); }
}
