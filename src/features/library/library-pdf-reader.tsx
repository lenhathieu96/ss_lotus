'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { loadPdfJsAdapter, PdfJsAdapter, PdfOutlineItem } from './library-pdfjs-adapter';
import { LibraryPdfReaderNavigation, ReaderOutlineItem } from './library-pdf-reader-navigation';
import { LibraryPdfReaderToolbar } from './library-pdf-reader-toolbar';
import { ReaderFindOptions, ReaderFindState } from './library-pdf-reader-search';
import type { PdfThumbnailDocument } from './library-pdf-reader-thumbnails';

const MAX_CANVAS_PIXELS = 16_777_216;
const MAX_SCALE = 2.5;
const MIN_SCALE = 0.5;
const RANGE_CHUNK_SIZE = 1_048_576;

type PdfDocument = PdfThumbnailDocument & Readonly<{
  getOutline: () => Promise<PdfOutlineItem[] | null>;
}>;

type ReaderRuntime = Readonly<{
  adapter: PdfJsAdapter;
  document: PdfDocument;
  eventBus: InstanceType<PdfJsAdapter['viewer']['EventBus']>;
  findController: InstanceType<PdfJsAdapter['viewer']['PDFFindController']>;
  linkService: InstanceType<PdfJsAdapter['viewer']['PDFLinkService']>;
  pdfViewer: InstanceType<PdfJsAdapter['viewer']['PDFViewer']>;
}>;

type LibraryPdfReaderProps = Readonly<{
  downloadUrl: string;
  onPdfUnavailable: () => Promise<void>;
  pdfUrl: string;
  title: string;
}>;

function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(Math.round(page), 1), Math.max(pageCount, 1));
}

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function isUnavailablePdfError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined;
  return status === 403 || status === 404 || error.name === 'MissingPDFException';
}

function pdfErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'PasswordException') return 'Tài liệu này được bảo vệ bằng mật khẩu nên không thể đọc trực tuyến.';
  if (error instanceof Error && error.name === 'InvalidPDFException') return 'Tệp này không phải là PDF hợp lệ hoặc đã bị hỏng.';
  if (isUnavailablePdfError(error)) return 'PDF không còn sẵn sàng. Hệ thống đang kiểm tra lại trạng thái tài liệu.';
  return 'Không thể tải trình đọc PDF. Kiểm tra kết nối hoặc mở/tải tài liệu bằng liên kết bên dưới.';
}

function toOutlineItems(items: PdfOutlineItem[]): ReaderOutlineItem[] {
  return items.flatMap((item) => {
    // Ignore external URLs, actions, attachments, and entries without a real
    // internal PDF destination. The reader never executes PDF-provided URLs.
    if (item.dest === null || typeof item.dest === 'undefined') return [];
    return [{
      destination: item.dest,
      items: toOutlineItems(item.items ?? []),
      title: item.title,
    }];
  });
}

export function LibraryPdfReader({ downloadUrl, onPdfUnavailable, pdfUrl, title }: LibraryPdfReaderProps) {
  const readerRef = useRef<HTMLElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const runtimeRef = useRef<ReaderRuntime | null>(null);
  const unavailableCheckedRef = useRef(false);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [findState, setFindState] = useState<ReaderFindState>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [outline, setOutline] = useState<ReaderOutlineItem[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [runtime, setRuntime] = useState<ReaderRuntime | null>(null);
  const [scale, setScale] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    let disposed = false;
    let loadingTask: Awaited<ReturnType<PdfJsAdapter['core']['getDocument']>> | null = null;
    let pdfViewer: ReaderRuntime['pdfViewer'] | null = null;
    let eventBus: ReaderRuntime['eventBus'] | null = null;
    const abortController = new AbortController();
    const cleanups: Array<() => void> = [];

    setIsLoading(true);
    setError(null);
    setOutline([]);
    setPageCount(0);
    setCurrentPage(1);
    setProgress(null);
    setRuntime(null);
    runtimeRef.current = null;
    unavailableCheckedRef.current = false;

    async function load() {
      try {
        const adapter = await loadPdfJsAdapter();
        if (disposed || !viewerContainerRef.current || !viewerRef.current) return;

        eventBus = new adapter.viewer.EventBus();
        const linkService = new adapter.viewer.PDFLinkService({ eventBus });
        const findController = new adapter.viewer.PDFFindController({ eventBus, linkService });
        pdfViewer = new adapter.viewer.PDFViewer({
          annotationMode: adapter.core.AnnotationMode.DISABLE,
          abortSignal: abortController.signal,
          container: viewerContainerRef.current,
          eventBus,
          findController,
          linkService,
          maxCanvasPixels: MAX_CANVAS_PIXELS,
          removePageBorders: false,
          textLayerMode: 2,
          viewer: viewerRef.current,
        });
        linkService.setViewer(pdfViewer);

        const onPageChanging = (event: Record<string, unknown>) => {
          const pageNumber = Number(event.pageNumber);
          if (Number.isFinite(pageNumber)) setCurrentPage(pageNumber);
        };
        const onScaleChanging = (event: Record<string, unknown>) => {
          const nextScale = Number(event.scale);
          if (Number.isFinite(nextScale)) setScale(clampScale(nextScale));
        };
        const onMatchesCount = (event: Record<string, unknown>) => {
          const matchesCount = event.matchesCount as { current?: number; total?: number } | undefined;
          const total = matchesCount?.total ?? 0;
          setCurrentMatch(matchesCount?.current ?? 0);
          setTotalMatches(total);
          if (matchesCount && total === 0) setFindState('not-found');
          else if (matchesCount && total > 0) setFindState('found');
        };
        const onFindState = (event: Record<string, unknown>) => {
          const state = Number(event.state);
          if (state === 1) setFindState('not-found');
          else if (state === 3) setFindState('searching');
          else if (Number.isFinite(state)) setFindState('found');
        };
        eventBus.on('pagechanging', onPageChanging);
        eventBus.on('scalechanging', onScaleChanging);
        eventBus.on('updatefindmatchescount', onMatchesCount);
        eventBus.on('updatefindcontrolstate', onFindState);
        cleanups.push(() => eventBus?.off('pagechanging', onPageChanging));
        cleanups.push(() => eventBus?.off('scalechanging', onScaleChanging));
        cleanups.push(() => eventBus?.off('updatefindmatchescount', onMatchesCount));
        cleanups.push(() => eventBus?.off('updatefindcontrolstate', onFindState));

        loadingTask = adapter.core.getDocument({
          disableAutoFetch: true,
          // Force range transport when S3 advertises it. A full response still
          // fails the operational browser-range gate rather than being hidden.
          disableRange: false,
          disableStream: true,
          enableXfa: false,
          isEvalSupported: false,
          rangeChunkSize: RANGE_CHUNK_SIZE,
          url: pdfUrl,
        });
        loadingTask.onProgress = ({ loaded, total }) => {
          if (!disposed && total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
        };

        const pdfDocument = await loadingTask.promise;
        if (disposed) return;

        pdfViewer.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument);
        let nextOutline: ReaderOutlineItem[] = [];
        try {
          nextOutline = toOutlineItems((await pdfDocument.getOutline()) ?? []);
        } catch {
          // The outline is optional. A malformed bookmark tree must not make a
          // readable document fail; navigation falls back to the page window.
          nextOutline = [];
        }
        if (disposed) return;
        const nextRuntime: ReaderRuntime = { adapter, document: pdfDocument, eventBus, findController, linkService, pdfViewer };
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
        setPageCount(pdfDocument.numPages);
        setScale(clampScale(pdfViewer.currentScale || 1));
        setOutline(nextOutline);
        setIsLoading(false);
      } catch (cause) {
        if (disposed) return;
        setError(pdfErrorMessage(cause));
        setIsLoading(false);
        if (isUnavailablePdfError(cause) && !unavailableCheckedRef.current) {
          unavailableCheckedRef.current = true;
          void onPdfUnavailable();
        }
      }
    }

    void load();
    return () => {
      disposed = true;
      abortController.abort();
      cleanups.forEach((cleanup) => cleanup());
      pdfViewer?.setDocument(null);
      pdfViewer?.cleanup();
      runtimeRef.current = null;
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
    };
  }, [onPdfUnavailable, pdfUrl, retryToken]);

  useEffect(() => {
    function handleFindShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase('vi-VN') !== 'f' || isEditableTarget(event.target)) return;
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== document.body && !readerRef.current?.contains(activeElement)) return;
      event.preventDefault();
      searchInputRef.current?.focus();
    }

    document.addEventListener('keydown', handleFindShortcut);
    return () => document.removeEventListener('keydown', handleFindShortcut);
  }, []);

  const setPage = useCallback((page: number) => {
    const currentRuntime = runtimeRef.current;
    if (!currentRuntime) return;
    currentRuntime.pdfViewer.currentPageNumber = clampPage(page, pageCount);
  }, [pageCount]);

  const updateScale = useCallback((nextScale: number) => {
    const currentRuntime = runtimeRef.current;
    if (!currentRuntime) return;
    const boundedScale = clampScale(nextScale);
    currentRuntime.pdfViewer.currentScale = boundedScale;
    setScale(boundedScale);
  }, []);

  function find(query: string, options: ReaderFindOptions = {}) {
    const currentRuntime = runtimeRef.current;
    const normalized = query.trim();
    if (!currentRuntime || !normalized) {
      clearFind();
      return;
    }
    setFindState('searching');
    currentRuntime.findController.executeCommand(options.findAgain ? 'findagain' : 'find', {
      findPrevious: options.findPrevious ?? false,
      highlightAll: true,
      phraseSearch: true,
      query: normalized,
    });
  }

  function clearFind() {
    const currentRuntime = runtimeRef.current;
    currentRuntime?.findController.executeCommand('find', { highlightAll: true, query: '' });
    setCurrentMatch(0);
    setFindState('idle');
    setTotalMatches(0);
  }

  function goToDestination(destination: ReaderOutlineItem['destination']) {
    const currentRuntime = runtimeRef.current;
    if (!currentRuntime) return;
    void currentRuntime.linkService.goToDestination(destination).then(() => setNavigationOpen(false)).catch(() => setError('Không thể chuyển đến mục này trong tài liệu.'));
  }

  return <section ref={readerRef} className="library-pdf-reader" aria-label={`Đọc trực tuyến: ${title}`}>
    <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
      <LibraryPdfReaderToolbar
        currentMatch={currentMatch}
        currentPage={currentPage}
        downloadUrl={downloadUrl}
        findState={findState}
        navigationControl={<SheetTrigger asChild><Button type="button" size="sm" variant="outline">Mục lục</Button></SheetTrigger>}
        onClearFind={clearFind}
        onFind={find}
        onNextPage={() => setPage(currentPage + 1)}
        onPreviousPage={() => setPage(currentPage - 1)}
        onSetPage={setPage}
        onZoomIn={() => updateScale(scale + 0.15)}
        onZoomOut={() => updateScale(scale - 0.15)}
        onZoomReset={() => updateScale(1)}
        pageCount={pageCount}
        pdfUrl={pdfUrl}
        scale={scale}
        searchInputRef={searchInputRef}
        totalMatches={totalMatches}
      />
      <SheetContent side="left" className="library-reader-navigation-sheet">
        <SheetHeader><SheetTitle>Điều hướng tài liệu</SheetTitle></SheetHeader>
        <LibraryPdfReaderNavigation
          onGoToDestination={goToDestination}
          onGoToPage={(page) => { setPage(page); setNavigationOpen(false); }}
          outline={outline}
          thumbnailDocument={runtime?.document ?? null}
        />
      </SheetContent>
    </Sheet>

    {error && <Card className="library-reader-error" role="alert">
      <h2>Không thể đọc trực tuyến</h2>
      <p>{error}</p>
      <div><Button type="button" variant="catalog" onClick={() => setRetryToken((value) => value + 1)}>Thử lại</Button><a href={pdfUrl} target="_blank" rel="noreferrer">Mở PDF trong tab mới</a><a href={downloadUrl}>Tải PDF</a></div>
    </Card>}

    <div className="library-reader-stage" aria-busy={isLoading}>
      {isLoading && <p className="library-reader-loading" role="status">{progress === null ? 'Đang tải PDF…' : `Đang tải PDF… ${progress}%`}</p>}
      <div ref={viewerContainerRef} className="library-reader-document-scroll" tabIndex={0} aria-label="Nội dung PDF">
        <div ref={viewerRef} className="pdfViewer library-reader-pages" />
      </div>
    </div>
    <p className="library-reader-page-status" aria-live="polite">{pageCount ? `Trang ${currentPage} trên ${pageCount}` : 'Đang chuẩn bị trang'}</p>
  </section>;
}
