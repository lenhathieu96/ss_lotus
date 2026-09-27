import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LibraryPdfReader } from './library-pdf-reader';

const mocks = vi.hoisted(() => {
  class FakeEventBus {
    static latest: FakeEventBus | null = null;
    listeners = new Map<string, Set<(event: Record<string, unknown>) => void>>();
    constructor() { FakeEventBus.latest = this; }
    emit(eventName: string, event: Record<string, unknown>) { this.listeners.get(eventName)?.forEach((listener) => listener(event)); }
    on(eventName: string, listener: (event: Record<string, unknown>) => void) { (this.listeners.get(eventName) ?? this.listeners.set(eventName, new Set()).get(eventName)!).add(listener); }
    off(eventName: string, listener: (event: Record<string, unknown>) => void) { this.listeners.get(eventName)?.delete(listener); }
  }
  class FakeLinkService {
    constructor(_options: unknown) {}
    setViewer = vi.fn();
    setDocument = vi.fn();
    goToDestination = vi.fn(() => Promise.resolve());
  }
  class FakeFindController {
    executeCommand = vi.fn();
    constructor(_options: unknown) {}
  }
  class FakePdfViewer {
    currentScale = 1;
    private page = 1;
    constructor(private readonly options: { eventBus: FakeEventBus }) {}
    get currentPageNumber() { return this.page; }
    set currentPageNumber(value: number) { this.page = value; this.options.eventBus.emit('pagechanging', { pageNumber: value }); }
    setDocument = vi.fn();
    cleanup = vi.fn();
    increaseScale = vi.fn();
    decreaseScale = vi.fn();
  }
  class FakeThumbnailViewer {
    constructor(_options: unknown) {}
    setDocument = vi.fn();
    cleanup = vi.fn();
  }
  const document = { getOutline: vi.fn(async () => []), getPage: vi.fn(), numPages: 3 };
  const destroy = vi.fn(async () => undefined);
  const getDocument = vi.fn(() => ({ destroy, promise: Promise.resolve(document) }));
  const loadPdfJsAdapter = vi.fn(async () => ({
    core: { AnnotationMode: { DISABLE: 0 }, getDocument },
    viewer: { EventBus: FakeEventBus, PDFFindController: FakeFindController, PDFLinkService: FakeLinkService, PDFThumbnailViewer: FakeThumbnailViewer, PDFViewer: FakePdfViewer },
  }));
  return { FakeEventBus, destroy, document, getDocument, loadPdfJsAdapter };
});

vi.mock('./library-pdfjs-adapter', () => ({ loadPdfJsAdapter: mocks.loadPdfJsAdapter }));

describe('LibraryPdfReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.document.getOutline.mockResolvedValue([]);
    mocks.getDocument.mockReturnValue({ destroy: mocks.destroy, promise: Promise.resolve(mocks.document) });
  });

  it('renders through the adapter, bounds page navigation, and clears work on unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<LibraryPdfReader downloadUrl="/download" onPdfUnavailable={vi.fn(async () => undefined)} pdfUrl="https://example.test/document.pdf" title="Kinh sách" />);
    expect(await screen.findByText('Trang 1 trên 3')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(await screen.findByText('Trang 2 trên 3')).toBeVisible();
    await user.clear(screen.getByRole('spinbutton', { name: 'Số trang hiện tại' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Số trang hiện tại' }), '99');
    await user.tab();
    expect(await screen.findByText('Trang 3 trên 3')).toBeVisible();

    unmount();
    await waitFor(() => expect(mocks.destroy).toHaveBeenCalledTimes(1));
  });

  it('delegates selectable-text find and reports the match count', async () => {
    const user = userEvent.setup();
    render(<LibraryPdfReader downloadUrl="/download" onPdfUnavailable={vi.fn(async () => undefined)} pdfUrl="https://example.test/document.pdf" title="Kinh sách" />);
    await screen.findByText('Trang 1 trên 3');

    await user.type(screen.getByRole('searchbox', { name: 'Tìm trong tài liệu' }), 'pháp danh');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    await act(async () => mocks.FakeEventBus.latest?.emit('updatefindmatchescount', { matchesCount: { current: 1, total: 2 } }));
    expect(await screen.findByText('Kết quả 1 trên 2.')).toBeVisible();
  });

  it('falls back to thumbnails when an optional PDF outline cannot be read', async () => {
    mocks.document.getOutline.mockRejectedValueOnce(new Error('invalid outline'));
    render(<LibraryPdfReader downloadUrl="/download" onPdfUnavailable={vi.fn(async () => undefined)} pdfUrl="https://example.test/document.pdf" title="Kinh sách" />);
    expect(await screen.findByText('Trang 1 trên 3')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.document.getOutline).toHaveBeenCalledTimes(1);
  });

  it('scopes Ctrl+F to the mounted reader and leaves editable fields alone', async () => {
    render(<LibraryPdfReader downloadUrl="/download" onPdfUnavailable={vi.fn(async () => undefined)} pdfUrl="https://example.test/document.pdf" title="Kinh sách" />);
    await screen.findByText('Trang 1 trên 3');
    const findInput = screen.getByRole('searchbox', { name: 'Tìm trong tài liệu' });
    const pageInput = screen.getByRole('spinbutton', { name: 'Số trang hiện tại' });

    fireEvent.keyDown(document, { ctrlKey: true, key: 'f' });
    expect(findInput).toHaveFocus();
    pageInput.focus();
    fireEvent.keyDown(pageInput, { ctrlKey: true, key: 'f' });
    expect(pageInput).toHaveFocus();
  });

  it('rechecks metadata once for a missing PDF and keeps a retry fallback', async () => {
    const onPdfUnavailable = vi.fn(async () => undefined);
    mocks.getDocument.mockReturnValue({
      destroy: mocks.destroy,
      promise: Promise.reject(Object.assign(new Error('missing'), { name: 'MissingPDFException' })),
    });
    render(<LibraryPdfReader downloadUrl="/download" onPdfUnavailable={onPdfUnavailable} pdfUrl="https://example.test/document.pdf" title="Kinh sách" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('PDF không còn sẵn sàng');
    await waitFor(() => expect(onPdfUnavailable).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('link', { name: 'Tải PDF' }).at(-1)).toHaveAttribute('href', '/download');
  });
});
