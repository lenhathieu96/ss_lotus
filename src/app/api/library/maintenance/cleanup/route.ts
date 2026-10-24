import { NextRequest } from 'next/server';
import { getLibraryServerLifecycleSource } from '@/data/library/network/server/source';
import { requireLibraryAdmin, routeErrorResponse } from '@/lib/library-server-auth';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLibraryAdmin(request);
    return Response.json({ cleaned: await getLibraryServerLifecycleSource().cleanupExpiredUploads(admin.userId) });
  } catch (error) { return routeErrorResponse(error); }
}
