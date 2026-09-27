import { hasPdfSignature, LibraryUploadTicket } from './library-domain';
import { cancelLibraryS3Upload, completeLibraryS3Upload, prepareLibraryS3Upload, resolveLibraryS3Upload } from './library-storage-api';

export type LibraryUploadProgress = Readonly<{ uploadedBytes: number; totalBytes: number; percent: number }>;

async function putStagedPdf(file: File, ticket: LibraryUploadTicket, onProgress: (progress: LibraryUploadProgress) => void, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Upload cancelled', 'AbortError')); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    xhr.open('PUT', ticket.uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('If-None-Match', '*');
    xhr.upload.onprogress = (event) => onProgress({ uploadedBytes: event.loaded, totalBytes: event.total || file.size, percent: Math.floor((event.loaded / (event.total || file.size || 1)) * 100) });
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Staged upload was not accepted.'));
    xhr.onerror = () => reject(new Error('Staged upload outcome is unknown.'));
    xhr.ontimeout = () => reject(new Error('Staged upload outcome is unknown.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    signal?.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}

export async function startLibraryPdfUpload(input: {
  file: File;
  title: string;
  author: string;
  categoryId: string;
  onProgress: (progress: LibraryUploadProgress) => void;
  onPrepared?: (ticket: LibraryUploadTicket) => void;
  signal?: AbortSignal;
}): Promise<LibraryUploadTicket> {
  if (!await hasPdfSignature(input.file)) throw new Error('Tệp không có chữ ký PDF hợp lệ.');
  const ticket = await prepareLibraryS3Upload(input);
  input.onPrepared?.(ticket);
  try {
    await putStagedPdf(input.file, ticket, input.onProgress, input.signal);
    await completeLibraryS3Upload(ticket.documentId);
  } catch (cause) {
    const resolved = await resolveLibraryS3Upload(ticket.documentId).catch(() => ({ status: 'pending' as const }));
    if (resolved.status === 'published') return ticket;
    if (input.signal?.aborted) await cancelLibraryS3Upload(ticket.documentId).catch(() => undefined);
    throw cause instanceof Error ? cause : new Error('Không thể tải PDF; lượt tải đang được dàn xếp trước khi thử lại.');
  }
  return ticket;
}
