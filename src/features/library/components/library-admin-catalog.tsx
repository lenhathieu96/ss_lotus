'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { LibraryAdminDocument, LibraryCategory, normalizeLibraryQuery, normalizeLibraryText } from '../library-repository';

export function LibraryAdminCatalog({ categories, documents, loading, onEdit, onDelete }: {
  categories: LibraryCategory[];
  documents: LibraryAdminDocument[];
  loading: boolean;
  onEdit: (document: LibraryAdminDocument) => void;
  onDelete: (document: LibraryAdminDocument) => void;
}) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const published = documents.filter((document) => document.status === 'published');
  // Keep documents discoverable while categories are refreshing or have changed.
  const groups = [...categories];
  for (const document of published) {
    if (!groups.some((category) => category.id === document.categoryId)) {
      groups.push({ id: document.categoryId, name: document.categoryName, position: groups.length });
    }
  }
  const selectedId = groups.some((category) => category.id === categoryId) ? categoryId : '';
  const search = normalizeLibraryQuery(query);
  const visible = published.filter((document) => (!selectedId || document.categoryId === selectedId)
    && [document.title, document.author ?? '', document.originalFilename].some((value) => normalizeLibraryText(value).includes(search)));
  const selectedName = groups.find((category) => category.id === selectedId)?.name;

  return <div className="library-browse-layout library-filter-layout">
    <div className="library-filter-bar" aria-label="Bộ lọc thư viện">
    <aside className="library-browse-sidebar">
      <h2>Đầu mục</h2>
      <Label className="library-mobile-category">Chọn đầu mục
        <select value={selectedId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Tất cả tài liệu ({published.length})</option>
          {groups.map((category) => <option key={category.id} value={category.id}>{category.name} ({published.filter((document) => document.categoryId === category.id).length})</option>)}
        </select>
      </Label>
      <nav aria-label="Duyệt theo đầu mục">
      <Button variant="ghost" className="library-category-filter" aria-pressed={!selectedId} onClick={() => setCategoryId('')}>
        <span>Tất cả tài liệu</span>{' '}<span>{published.length}</span>
      </Button>
      {groups.map((category) => <Button key={category.id} variant="ghost" className="library-category-filter" aria-pressed={selectedId === category.id} onClick={() => setCategoryId(category.id)}>
        <span>{category.name}</span>{' '}<span>{published.filter((document) => document.categoryId === category.id).length}</span>
      </Button>)}
      </nav>
      <p className="library-sidebar-hint">Chọn đầu mục để khám phá sách và tài liệu.</p>
    </aside>
      <div className="library-browse-toolbar">
        <Label className="library-browse-search" htmlFor="library-book-search">Tìm trong thư viện
          <span><Search size={20} aria-hidden="true" /><Input id="library-book-search" type="search" placeholder="Tên sách, tác giả hoặc tên tệp…" value={query} onChange={(event) => setQuery(event.target.value)} /></span>
        </Label>
        <div><h2>{selectedName || 'Tất cả tài liệu'}</h2><p role="status">{loading ? 'Đang tải tài liệu…' : `${visible.length} tài liệu${search ? ' phù hợp' : ' có thể đọc'}`}</p></div>
        {(query || selectedId) && <Button variant="ghost" onClick={() => { setQuery(''); setCategoryId(''); }}>Xóa bộ lọc</Button>}
      </div>
    </div>
    <section className="library-browse-content" aria-label="Danh sách tài liệu" aria-busy={loading}>
      {!loading && visible.length === 0 && <div className="empty-panel"><BookOpen aria-hidden="true" /><h3>{search ? 'Không tìm thấy tài liệu' : 'Chưa có tài liệu trong đầu mục này'}</h3><p>{search ? 'Thử một tên sách, tác giả khác hoặc chọn đầu mục khác.' : 'Các tài liệu được công khai sẽ xuất hiện tại đây.'}</p></div>}
      {groups.map((category) => {
        const books = visible.filter((document) => document.categoryId === category.id);
        if (!books.length) return null;
        return <section className="library-book-group" key={category.id} aria-labelledby={`book-group-${category.id}`}>
          <header><h3 id={`book-group-${category.id}`}>{category.name}</h3><span>{books.length} tài liệu</span></header>
          <ul className="library-book-list">{books.map((document) => <li className="library-book-row" key={document.id}>
            <div className="library-book-symbol"><BookOpen size={24} aria-hidden="true" /></div>
            <div className="library-book-info"><h4><Link href={`/thu-vien/${document.id}`}>{document.title}</Link></h4><p>{document.author || 'Chưa cập nhật tác giả'}</p><p className="library-book-meta"><span>PDF</span><span>· {document.originalFilename}</span></p></div>
            <div className="library-book-actions"><Button asChild variant="outline"><Link href={`/thu-vien/${document.id}`}>Xem</Link></Button><Button variant="ghost" aria-label={`Sửa ${document.title}`} onClick={() => onEdit(document)}>Sửa</Button><Button variant="ghost" aria-label={`Xóa ${document.title}`} onClick={() => onDelete(document)}>Xóa</Button></div>
          </li>)}</ul>
        </section>;
      })}
    </section>
  </div>;
}
