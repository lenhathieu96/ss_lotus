'use client';

import Link from 'next/link';
import { Button } from '@components/ui/button';
import { Label } from '@components/ui/label';
import { LibraryCategory } from '../library-repository';

type LibraryCategoryNavigationProps = Readonly<{
  categories: LibraryCategory[];
  getHref?: (categoryId: string) => string;
  onSelect?: (categoryId: string) => void;
  selectedCategoryId: string;
}>;

export function LibraryCategoryNavigation({ categories, getHref, onSelect, selectedCategoryId }: LibraryCategoryNavigationProps) {
  function selectCategory(categoryId: string) {
    if (getHref) window.location.assign(getHref(categoryId));
    else onSelect?.(categoryId);
  }

  return <aside className="library-browse-sidebar">
    <h2>Đầu mục</h2>
    <Label className="library-mobile-category">Chọn đầu mục
      <select aria-label="Lọc theo đầu mục" value={selectedCategoryId} onChange={(event) => selectCategory(event.target.value)}>
        <option value="">Tất cả đầu mục</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
    </Label>
    <nav aria-label="Duyệt theo đầu mục">
      {getHref
        ? <Link className="library-category-filter" aria-current={!selectedCategoryId ? 'page' : undefined} href={getHref('')}><span>Tất cả tài liệu</span></Link>
        : <Button variant="ghost" className="library-category-filter" aria-pressed={!selectedCategoryId} onClick={() => selectCategory('')}><span>Tất cả tài liệu</span></Button>}
      {categories.map((category) => getHref
        ? <Link key={category.id} className="library-category-filter" aria-current={category.id === selectedCategoryId ? 'page' : undefined} href={getHref(category.id)}><span>{category.name}</span></Link>
        : <Button key={category.id} variant="ghost" className="library-category-filter" aria-pressed={category.id === selectedCategoryId} onClick={() => selectCategory(category.id)}><span>{category.name}</span></Button>)}
    </nav>
    <p className="library-sidebar-hint">Chọn đầu mục để khám phá sách và tài liệu.</p>
  </aside>;
}
