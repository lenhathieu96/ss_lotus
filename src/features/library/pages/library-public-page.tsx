'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Button } from '@components/ui/button';
import { LibraryCategoryNavigation } from '../components/library-category-navigation';
import { listLibraryCategories, searchLibraryDocuments } from '../library-repository';
import { LibraryCategory, LibraryCursor, LibraryDocument, LIBRARY_PAGE_SIZE } from '../library-repository';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LibraryPublicPage({ initialCategoryId = '' }: { initialCategoryId?: string }) {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(uuidPattern.test(initialCategoryId) ? initialCategoryId : '');
  const [cursor, setCursor] = useState<LibraryCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latestRequestId = useRef(0);

  const load = useCallback(async (append = false, requestQuery = query, requestCategory = categoryId, requestCursor = cursor) => {
    const requestId = ++latestRequestId.current;
    setLoading(true);
    try {
      const [categoryRows, rows] = await Promise.all([
        append ? Promise.resolve(categories) : listLibraryCategories(),
        searchLibraryDocuments({ query: requestQuery, categoryId: requestCategory, cursor: append ? requestCursor : null, limit: LIBRARY_PAGE_SIZE + 1 }),
      ]);
      if (requestId !== latestRequestId.current) return;
      const pageRows = rows.slice(0, LIBRARY_PAGE_SIZE);
      const last = pageRows.at(-1);
      if (!append) setCategories(categoryRows);
      setDocuments((previous) => append ? [...previous, ...pageRows.filter((row) => !previous.some((item) => item.id === row.id))] : pageRows);
      setCursor(rows.length > LIBRARY_PAGE_SIZE && last ? { publishedAt: last.publishedAt, id: last.id } : null);
      setHasMore(rows.length > LIBRARY_PAGE_SIZE);
      setError('');
    } catch {
      if (requestId === latestRequestId.current) setError('Không thể tải thư viện. Vui lòng thử lại.');
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, [categories, categoryId, cursor, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(false, query, categoryId, null); }, 220);
    return () => {
      window.clearTimeout(timer);
      latestRequestId.current += 1;
    };
  }, [categoryId, query]);

  return <main className="page library-public-page">
    <h1 className="sr-only">Thư viện</h1>
    <div className="library-browse-layout library-public-layout library-filter-layout">
      <div className="library-filter-bar" aria-label="Bộ lọc thư viện">
      <LibraryCategoryNavigation categories={categories} selectedCategoryId={categoryId} onSelect={setCategoryId} />
        <Card className="library-search-panel library-public-search-panel">
          <Label className="form-field">Tìm tài liệu<Input aria-label="Tìm theo tên tài liệu hoặc tác giả" type="search" placeholder="Nhập tên sách hoặc tác giả" value={query} onChange={(event) => setQuery(event.target.value)} /></Label>
        </Card>
      </div>
      <section className="library-browse-content">
        {error && <p className="notice" role="alert">{error} <Button variant="catalog" size="sm" onClick={() => void load(false)}>Thử lại</Button></p>}
        {loading && documents.length === 0 ? <p className="empty-panel" role="status">Đang tải tài liệu…</p> : documents.length === 0 ? <Card className="empty-panel">Chưa có tài liệu phù hợp.</Card> : <section className="library-document-grid" aria-label="Danh sách tài liệu">
          {documents.map((document) => <Card className="library-document-card" key={document.id}><p className="eyebrow">{document.categoryName}</p><h2><Link href={`/thu-vien/${document.id}`}>{document.title}</Link></h2><p>{document.author ? `Tác giả: ${document.author}` : 'Chưa cập nhật tác giả'}</p><Link className="library-read-link" href={`/thu-vien/${document.id}`}>Đọc tài liệu</Link></Card>)}
        </section>}
        {hasMore && <div className="library-load-more"><Button variant="catalog" disabled={loading || !cursor} onClick={() => void load(true)}>{loading ? 'Đang tải…' : 'Xem thêm'}</Button></div>}
      </section>
    </div>
  </main>;
}
