'use client';

import { forwardRef, FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ReaderFindState = 'idle' | 'searching' | 'found' | 'not-found';
export type ReaderFindOptions = Readonly<{ findAgain?: boolean; findPrevious?: boolean }>;

type LibraryPdfReaderSearchProps = Readonly<{
  currentMatch: number;
  findState: ReaderFindState;
  onClear: () => void;
  onFind: (query: string, options?: ReaderFindOptions) => void;
  totalMatches: number;
}>;

export const LibraryPdfReaderSearch = forwardRef<HTMLInputElement, LibraryPdfReaderSearchProps>(
  function LibraryPdfReaderSearch({ currentMatch, findState, onClear, onFind, totalMatches }, ref) {
    const [query, setQuery] = useState('');

    useEffect(() => {
      if (findState === 'idle') setQuery('');
    }, [findState]);

    function submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      onFind(query);
    }

    const resultMessage = findState === 'searching'
      ? 'Đang tìm trong tài liệu…'
      : findState === 'not-found'
        ? 'Không tìm thấy nội dung phù hợp.'
        : findState === 'found'
          ? `Kết quả ${currentMatch || 1} trên ${totalMatches}.`
          : 'Nhập từ khóa để tìm trong tài liệu.';

    return <form className="library-reader-search" onSubmit={submit} role="search">
      <label className="visually-hidden" htmlFor="library-reader-find">Tìm trong tài liệu</label>
      <Input
        ref={ref}
        id="library-reader-find"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm trong tài liệu"
        type="search"
      />
      <div className="library-reader-search-actions">
        <Button type="submit" size="sm" variant="outline">Tìm</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onFind(query, { findAgain: true, findPrevious: true })} disabled={!query.trim()} aria-label="Kết quả trước">↑</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onFind(query, { findAgain: true })} disabled={!query.trim()} aria-label="Kết quả tiếp theo">↓</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={!query && findState === 'idle'}>Xóa</Button>
      </div>
      <output className="library-reader-find-status" aria-live="polite">{resultMessage}</output>
    </form>;
  },
);
