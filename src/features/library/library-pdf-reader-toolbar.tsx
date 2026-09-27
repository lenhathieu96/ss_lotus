'use client';

import { ReactNode, RefObject, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LibraryPdfReaderSearch, ReaderFindOptions, ReaderFindState } from './library-pdf-reader-search';

type LibraryPdfReaderToolbarProps = Readonly<{
  currentPage: number;
  downloadUrl: string;
  findState: ReaderFindState;
  navigationControl: ReactNode;
  onClearFind: () => void;
  onFind: (query: string, options?: ReaderFindOptions) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSetPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  pageCount: number;
  pdfUrl: string;
  scale: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  currentMatch: number;
  totalMatches: number;
}>;

export function LibraryPdfReaderToolbar({
  currentMatch,
  currentPage,
  downloadUrl,
  findState,
  navigationControl,
  onClearFind,
  onFind,
  onNextPage,
  onPreviousPage,
  onSetPage,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  pageCount,
  pdfUrl,
  scale,
  searchInputRef,
  totalMatches,
}: LibraryPdfReaderToolbarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => setPageInput(String(currentPage)), [currentPage]);

  function submitPage() {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) onSetPage(parsed);
    else setPageInput(String(currentPage));
  }

  return <header className="library-reader-toolbar">
    <div className="library-reader-toolbar-actions">
      {navigationControl}
      <Button type="button" size="sm" variant="outline" onClick={onPreviousPage} disabled={currentPage <= 1} aria-label="Trang trước">←</Button>
      <label className="library-reader-page-control">Trang
        <Input
          aria-label="Số trang hiện tại"
          inputMode="numeric"
          min={1}
          max={Math.max(pageCount, 1)}
          onBlur={submitPage}
          onChange={(event) => setPageInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitPage(); } }}
          type="number"
          value={pageInput}
        />
        <span>/ {pageCount || '—'}</span>
      </label>
      <Button type="button" size="sm" variant="outline" onClick={onNextPage} disabled={!pageCount || currentPage >= pageCount} aria-label="Trang sau">→</Button>
    </div>
    <div className="library-reader-toolbar-actions library-reader-zoom-controls">
      <Button type="button" size="sm" variant="ghost" onClick={onZoomOut} aria-label="Thu nhỏ">−</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onZoomReset} aria-label="Đặt lại tỷ lệ">{Math.round(scale * 100)}%</Button>
      <Button type="button" size="sm" variant="ghost" onClick={onZoomIn} aria-label="Phóng to">+</Button>
    </div>
    <LibraryPdfReaderSearch
      ref={searchInputRef}
      currentMatch={currentMatch}
      findState={findState}
      onClear={onClearFind}
      onFind={onFind}
      totalMatches={totalMatches}
    />
    <div className="library-reader-toolbar-actions library-reader-file-actions">
      <Button asChild type="button" size="sm" variant="catalog"><a href={downloadUrl}>Tải PDF</a></Button>
      <Button asChild type="button" size="sm" variant="outline"><a href={pdfUrl} target="_blank" rel="noreferrer">Mở tab mới</a></Button>
    </div>
  </header>;
}
