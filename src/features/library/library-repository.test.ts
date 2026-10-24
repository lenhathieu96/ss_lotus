import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, invoke, rpc } = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn(), rpc: vi.fn() }));
vi.mock('@data/network/supabase/browser-client', () => ({
  supabase: { rpc, auth: { getSession }, functions: { invoke } },
  supabaseConfigurationError: null,
}));

import {
  LIBRARY_MAX_PDF_BYTES,
  cancelLibraryUpload,
  cleanupLibraryUploads,
  completeLibraryUpload,
  deleteLibraryDocument,
  defaultLibraryTitle,
  getLibraryDownloadUrl,
  hasPdfSignature,
  isLibraryAdmin,
  normalizeLibraryQuery,
  prepareLibraryUpload,
  publicLibraryDocumentUrl,
  reconcileLibraryDocument,
  recoverLibraryUpload,
  resolveLibraryUpload,
  runLibraryUploadQueue,
  safeDownloadFileName,
  startLibraryPdfUpload,
  toLibraryPage,
  validatePdfMetadata,
} from './library-repository';

const id = '123e4567-e89b-42d3-a456-426614174000';
const ticket = { documentId: id, uploadUrl: 'https://signed.test/put', stagingPath: `pending/${id}.pdf`, expiresAt: 'later' };
const signedUrl = `https://ss-lotus-pdf.s3.ap-southeast-1.amazonaws.com/documents/${id}.pdf?X-Amz-Signature=example`;

class UploadRequest {
  static latest: UploadRequest;
  status = 200;
  open = vi.fn();
  setRequestHeader = vi.fn();
  upload = { onprogress: null as null | ((event: { loaded: number; total: number }) => void) };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  abort = vi.fn(() => this.onabort?.());
  send = vi.fn();
  constructor() { UploadRequest.latest = this; }
}

function pdf(signature = '%PDF-') {
  const file = new File([signature], 'book.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'slice', { value: () => ({ arrayBuffer: async () => new TextEncoder().encode(signature).buffer }) });
  return file;
}

function lifecycle(action: string, data: unknown = { status: 'published' }) {
  return Promise.resolve({ data: action === 'prepare-upload' ? ticket : data, error: null });
}

async function prepared() { await vi.waitFor(() => expect(UploadRequest.latest?.send).toHaveBeenCalled()); }

beforeEach(() => {
  vi.clearAllMocks();
  UploadRequest.latest = undefined as never;
  vi.stubGlobal('XMLHttpRequest', UploadRequest);
  getSession.mockResolvedValue({ data: { session: { access_token: 'access-token' } }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
  invoke.mockImplementation((_name: string, options: { body: { action: string } }) => lifecycle(options.body.action));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('library document helpers', () => {
  it('normalizes Vietnamese search text and derives an editable title from the filename', () => {
    expect(normalizeLibraryQuery('  Đạo Phật  ')).toBe('dao phat');
    expect(defaultLibraryTitle('dao-phat_can-ban.PDF')).toBe('dao phat can ban');
  });

  it('sanitizes a suggested download filename without using the stored filename', () => {
    expect(safeDownloadFileName('Sách: Đạo Phật?')).toBe('Sách Đạo Phật.pdf');
  });

  it('validates PDF metadata, PDF signatures, and the 100 MB limit', async () => {
    const file = pdf();
    expect(validatePdfMetadata({ title: 'Sách', author: '', categoryId: 'c1', file })).toBeNull();
    expect(validatePdfMetadata({ title: ' ', author: '', categoryId: 'c1', file })).toContain('tên tài liệu');
    const oversized = new File([new Uint8Array(LIBRARY_MAX_PDF_BYTES + 1)], 'large.pdf', { type: 'application/pdf' });
    expect(validatePdfMetadata({ title: 'Sách', author: '', categoryId: 'c1', file: oversized })).toContain('100 MB');
    expect(await hasPdfSignature(file)).toBe(true);
  });

  it('provides a next cursor only when another page exists', () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({ id: `d${index}`, categoryId: 'c1', categoryName: 'Sử học', title: `Sách ${index}`, author: null, publishedAt: `2026-01-0${3 - index}` }));
    expect(toLibraryPage(rows, 2).nextCursor?.id).toBe('d1');
    expect(toLibraryPage(rows.slice(0, 2), 2).nextCursor).toBeNull();
  });
});

describe('library repository', () => {
  it('uses the established admin RPC and recognizes administrators', async () => {
    await expect(isLibraryAdmin()).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('is_admin');
  });

  it('keeps non-admin sessions denied', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await expect(isLibraryAdmin()).resolves.toBe(false);
  });

  it('sends metadata with the current session token when preparing a direct upload', async () => {
    const file = pdf();
    await expect(prepareLibraryUpload({ categoryId: 'category', title: 'Book', author: '', file })).resolves.toEqual(ticket);
    expect(invoke).toHaveBeenCalledWith('library-lifecycle', { body: { action: 'prepare-upload', categoryId: 'category', title: 'Book', author: '', originalFilename: 'book.pdf', expectedSize: file.size }, headers: { Authorization: 'Bearer access-token' } });
  });

  it.each([
    ['complete-upload', completeLibraryUpload], ['resolve-upload', resolveLibraryUpload],
    ['recover-upload', recoverLibraryUpload], ['cancel-upload', cancelLibraryUpload],
    ['delete-document', deleteLibraryDocument], ['reconcile-document', reconcileLibraryDocument],
  ])('uses the %s action and document identity', async (action, operation) => {
    await operation(id);
    expect(invoke).toHaveBeenCalledWith('library-lifecycle', { body: { action, documentId: id }, headers: { Authorization: 'Bearer access-token' } });
  });

  it('runs cleanup without a document identity and rejects expired sessions before transport', async () => {
    await cleanupLibraryUploads();
    expect(invoke).toHaveBeenCalledWith('library-lifecycle', { body: { action: 'cleanup-uploads' }, headers: { Authorization: 'Bearer access-token' } });
    getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(cancelLibraryUpload(id)).rejects.toThrow('Phiên đăng nhập');
  });

  it('allows anonymous fresh downloads and accepts regional S3 URLs', async () => {
    vi.stubEnv('NEXT_PUBLIC_S3_LIBRARY_BASE_URL', '');
    invoke.mockResolvedValueOnce({ data: { url: signedUrl }, error: null });
    await expect(getLibraryDownloadUrl(id)).resolves.toBe(signedUrl);
    const pathStyle = `https://s3.ap-southeast-1.amazonaws.com/ss-lotus-pdf/documents/${id}.pdf?X-Amz-Signature=example`;
    invoke.mockResolvedValueOnce({ data: { url: pathStyle }, error: null });
    await expect(getLibraryDownloadUrl(id)).resolves.toBe(pathStyle);
    expect(getSession).not.toHaveBeenCalled();
  });

  it.each([
    signedUrl.replace('https:', 'http:'), signedUrl.replace('.amazonaws.com', '.amazonaws.com.evil.test'),
    signedUrl.replace(id, 'another-document'), signedUrl.replace('/documents/', '/pending/'),
    'javascript:alert(1)', 'https://arbitrary.example/documents/file.pdf',
  ])('rejects an untrusted download URL: %s', async (url) => {
    invoke.mockResolvedValueOnce({ data: { url }, error: null });
    await expect(getLibraryDownloadUrl(id)).rejects.toThrow('không hợp lệ');
  });

  it('keeps preview direct to the configured public S3 base', () => {
    vi.stubEnv('NEXT_PUBLIC_S3_LIBRARY_BASE_URL', 'https://public.example.test');
    expect(publicLibraryDocumentUrl(id)).toBe(`https://public.example.test/documents/${id}.pdf`);
    vi.stubEnv('NEXT_PUBLIC_S3_LIBRARY_BASE_URL', 'http://public.example.test');
    expect(() => publicLibraryDocumentUrl(id)).toThrow('HTTPS');
  });

  it.each([[401, 'Phiên đăng nhập'], [403, 'không có quyền'], [409, 'Lượt tải đang được xử lý.']])('maps HTTP %i into an actionable error', async (status, message) => {
    invoke.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(new Response(JSON.stringify({ error: message }), { status })) });
    await expect(completeLibraryUpload(id)).rejects.toThrow(message);
  });

  it.each([
    [new FunctionsRelayError('relay unavailable'), 'tạm thời không khả dụng'],
    [new FunctionsFetchError('network unavailable'), 'Kiểm tra kết nối'],
    [new FunctionsHttpError(new Response('not json', { status: 502 })), 'Vui lòng thử lại'],
  ])('maps transport failures without leaking provider details', async (error, message) => {
    invoke.mockResolvedValueOnce({ data: null, error });
    await expect(completeLibraryUpload(id)).rejects.toThrow(message);
  });
});

describe('library upload workflow', () => {
  const input = () => ({ file: pdf(), title: 'Book', author: '', categoryId: 'category', onProgress: vi.fn() });

  it('rejects bytes without a PDF signature before requesting a ticket', async () => {
    await expect(startLibraryPdfUpload({ ...input(), file: pdf('wrong') })).rejects.toThrow('chữ ký PDF');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('uses direct create-only signed PUT, forwards progress, then completes', async () => {
    const options = input();
    const promise = startLibraryPdfUpload(options);
    await prepared();
    const xhr = UploadRequest.latest;
    expect(xhr.open).toHaveBeenCalledWith('PUT', ticket.uploadUrl);
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('If-None-Match', '*');
    xhr.upload.onprogress?.({ loaded: 2, total: 4 });
    expect(options.onProgress).toHaveBeenCalledWith({ uploadedBytes: 2, totalBytes: 4, percent: 50 });
    xhr.onload?.();
    await expect(promise).resolves.toEqual(ticket);
    expect(invoke).toHaveBeenCalledWith('library-lifecycle', { body: { action: 'complete-upload', documentId: id }, headers: { Authorization: 'Bearer access-token' } });
  });

  it('settles uncertain upload outcomes and cancels aborted unpublished uploads', async () => {
    invoke.mockImplementation((_name: string, options: { body: { action: string } }) => {
      if (options.body.action === 'resolve-upload') return Promise.resolve({ data: { status: 'published' }, error: null });
      return lifecycle(options.body.action);
    });
    const retry = startLibraryPdfUpload(input());
    await prepared();
    const retryRequest = UploadRequest.latest;
    UploadRequest.latest.onerror?.();
    await expect(retry).resolves.toEqual(ticket);

    invoke.mockImplementation((_name: string, options: { body: { action: string } }) => {
      if (options.body.action === 'resolve-upload') return Promise.resolve({ data: { status: 'pending' }, error: null });
      return lifecycle(options.body.action);
    });
    const controller = new AbortController();
    const aborted = startLibraryPdfUpload({ ...input(), signal: controller.signal });
    await vi.waitFor(() => expect(UploadRequest.latest).not.toBe(retryRequest));
    await prepared();
    controller.abort();
    await expect(aborted).rejects.toBeInstanceOf(Error);
    expect(UploadRequest.latest.abort).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('library-lifecycle', { body: { action: 'cancel-upload', documentId: id }, headers: { Authorization: 'Bearer access-token' } });
  });
});

describe('library upload queue', () => {
  it('limits concurrent uploads and keeps independent results', async () => {
    let active = 0;
    let peak = 0;
    const results = await runLibraryUploadQueue([1, 2, 3, 4, 5], 3, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, item === 2 ? 1 : 3));
      active -= 1;
      if (item === 3) throw new Error('one failed');
      return item * 2;
    });
    expect(peak).toBe(3);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  });
});
