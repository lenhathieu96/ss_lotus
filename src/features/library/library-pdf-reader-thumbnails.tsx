'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const THUMBNAIL_SCALE = 0.22;
const THUMBNAIL_WINDOW_SIZE = 8;

export type PdfThumbnailDocument = Readonly<{
  getPage: (pageNumber: number) => Promise<Readonly<{
    getViewport: (options: Readonly<{ scale: number }>) => Readonly<{ height: number; width: number }>;
    render: (options: Readonly<{ canvasContext: CanvasRenderingContext2D; viewport: Readonly<{ height: number; width: number }> }>) => Readonly<{
      cancel: () => void;
      promise: Promise<void>;
    }>;
  }>>;
  numPages: number;
}>;

function PdfThumbnail({ document, pageNumber }: Readonly<{ document: PdfThumbnailDocument; pageNumber: number }>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: Readonly<{ cancel: () => void; promise: Promise<void> }> | null = null;

    void document.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');
      if (cancelled || !canvas || !context) return;
      const viewport = page.getViewport({ scale: THUMBNAIL_SCALE });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      renderTask = page.render({ canvasContext: context, viewport });
      return renderTask.promise;
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}

export function LibraryPdfReaderThumbnails({ document, onGoToPage }: Readonly<{
  document: PdfThumbnailDocument;
  onGoToPage: (pageNumber: number) => void;
}>) {
  const [windowStart, setWindowStart] = useState(1);
  const maxStart = Math.max(1, document.numPages - THUMBNAIL_WINDOW_SIZE + 1);
  const pages = useMemo(() => Array.from(
    { length: Math.min(THUMBNAIL_WINDOW_SIZE, document.numPages - windowStart + 1) },
    (_, index) => windowStart + index,
  ), [document.numPages, windowStart]);

  useEffect(() => setWindowStart((start) => Math.min(start, maxStart)), [maxStart]);

  return <div className="library-reader-thumbnail-window">
    <div className="library-reader-thumbnail-controls">
      <Button type="button" size="sm" variant="outline" disabled={windowStart === 1} onClick={() => setWindowStart((start) => Math.max(1, start - THUMBNAIL_WINDOW_SIZE))}>Trang trước</Button>
      <span>{`${windowStart}–${pages.at(-1) ?? 0} / ${document.numPages}`}</span>
      <Button type="button" size="sm" variant="outline" disabled={windowStart >= maxStart} onClick={() => setWindowStart((start) => Math.min(maxStart, start + THUMBNAIL_WINDOW_SIZE))}>Trang sau</Button>
    </div>
    <ol className="library-reader-thumbnails">
      {pages.map((pageNumber) => <li key={pageNumber}>
        <Button type="button" variant="ghost" className="library-reader-thumbnail" onClick={() => onGoToPage(pageNumber)} aria-label={`Đi đến trang ${pageNumber}`}>
          <PdfThumbnail document={document} pageNumber={pageNumber} />
          <span>Trang {pageNumber}</span>
        </Button>
      </li>)}
    </ol>
  </div>;
}
