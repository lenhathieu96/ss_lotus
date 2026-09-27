import { NextRequest } from 'next/server';
import { createStagingUploadUrl } from '@/lib/s3-server';
import { invokeLibraryLifecycle, requireRpcRow, rpcString } from '@/lib/library-lifecycle-server';
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
    const data = await invokeLibraryLifecycle('prepare_s3_library_upload', {
      p_actor_id: admin.userId,
      p_category_id: categoryId,
      p_title: requiredString(input, 'title', 500),
      p_author: author,
      p_original_filename: requiredString(input, 'originalFilename', 500),
      p_expected_size: expectedSize,
    });
    const row = requireRpcRow(data, 'Could not create an upload ticket.');
    const documentId = rpcString(row, 'document_id');
    const ticket = await createStagingUploadUrl(documentId);
    return Response.json({ documentId, expiresAt: rpcString(row, 'upload_expires_at'), ...ticket });
  } catch (error) { return routeErrorResponse(error); }
}
