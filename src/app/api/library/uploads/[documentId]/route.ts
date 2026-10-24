import { NextRequest } from 'next/server';
import { getLibraryServerLifecycleSource } from '@/data/library/network/server/source';
import { requireLibraryAdmin, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

export async function DELETE(request: NextRequest, context: { params: Promise<{ documentId: string }> }) {
  try {
    const admin = await requireLibraryAdmin(request);
    const { documentId } = await context.params;
    requireUuid(documentId);
    await getLibraryServerLifecycleSource().cancelUpload(documentId, admin.userId);
    return Response.json({ status: 'cleaning' });
  } catch (error) { return routeErrorResponse(error); }
}
