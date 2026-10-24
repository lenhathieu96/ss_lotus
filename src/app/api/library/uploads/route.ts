import { NextRequest } from 'next/server';
import { getLibraryServerLifecycleSource } from '@/features/library/data/network/server/source';
import { LibraryRouteError, requireLibraryAdmin, requireObject, requiredString, requireUuid, routeErrorResponse } from '@/lib/library-server-auth';

const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const admin = await requireLibraryAdmin(request);
    const input = requireObject(await request.json());
    const expectedSize = input.expectedSize;
    if (typeof expectedSize !== 'number' || !Number.isSafeInteger(expectedSize) || expectedSize < 1 || expectedSize > MAX_PDF_SIZE_BYTES) {
      return Response.json({ error: 'PDF size must be between 1 byte and 100 MB.' }, { status: 400 });
    }
    const categoryId = requiredString(input, 'categoryId');
    requireUuid(categoryId, 'Invalid categoryId.');
    const author = typeof input.author === 'string' ? input.author.trim() : null;
    if (author && author.length > 500) throw new LibraryRouteError('Invalid author.', 400);
    return Response.json(await getLibraryServerLifecycleSource().prepareUpload({
      actorId: admin.userId,
      categoryId,
      title: requiredString(input, 'title', 500),
      author,
      originalFilename: requiredString(input, 'originalFilename', 500),
      expectedSize,
    }));
  } catch (error) { return routeErrorResponse(error); }
}
