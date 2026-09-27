'use client';

import { Button } from '@/components/ui/button';
import type { PdfOutlineItem } from './library-pdfjs-adapter';
import { LibraryPdfReaderThumbnails, PdfThumbnailDocument } from './library-pdf-reader-thumbnails';

export type ReaderOutlineItem = Readonly<{
  destination: PdfOutlineItem['dest'];
  items: ReaderOutlineItem[];
  title: string;
}>;

type LibraryPdfReaderNavigationProps = Readonly<{
  onGoToDestination: (destination: ReaderOutlineItem['destination']) => void;
  onGoToPage: (pageNumber: number) => void;
  outline: ReaderOutlineItem[];
  thumbnailDocument: PdfThumbnailDocument | null;
}>;

function OutlineItems({ items, onGoToDestination }: Readonly<{
  items: ReaderOutlineItem[];
  onGoToDestination: (destination: ReaderOutlineItem['destination']) => void;
}>) {
  return <ul className="library-reader-outline-list">
    {items.map((item, index) => <li key={`${item.title}-${index}`}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="library-reader-outline-link"
        onClick={() => onGoToDestination(item.destination)}
      >
        {item.title || 'Mục không tên'}
      </Button>
      {item.items.length > 0 && <OutlineItems items={item.items} onGoToDestination={onGoToDestination} />}
    </li>)}
  </ul>;
}

export function LibraryPdfReaderNavigation({ onGoToDestination, onGoToPage, outline, thumbnailDocument }: LibraryPdfReaderNavigationProps) {
  const hasOutline = outline.length > 0;

  return <nav className="library-reader-navigation" aria-label={hasOutline ? 'Mục lục tài liệu' : 'Trang tài liệu'}>
    <p className="eyebrow">{hasOutline ? 'MỤC LỤC' : 'CÁC TRANG'}</p>
    {hasOutline
      ? <OutlineItems items={outline} onGoToDestination={onGoToDestination} />
      : <><p className="library-reader-navigation-note">Tài liệu chưa có mục lục. Chọn hình thu nhỏ để chuyển trang.</p>{thumbnailDocument && <LibraryPdfReaderThumbnails document={thumbnailDocument} onGoToPage={onGoToPage} />}</>}
  </nav>;
}
