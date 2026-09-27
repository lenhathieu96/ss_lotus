'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LibraryCategory } from './library-domain';

export function LibraryCategoryManager({ categories, onCreate, onUpdate, onReorder, onDelete }: {
  categories: LibraryCategory[];
  onCreate: (name: string) => Promise<void>;
  onUpdate: (category: LibraryCategory) => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<LibraryCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể cập nhật đầu mục.'); }
    finally { setBusy(false); }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    await run(() => onReorder(next.map((category) => category.id)));
  }

  return <section className="library-category-manager" aria-labelledby="library-categories-title">
    <div className="library-section-heading"><div><h2 id="library-categories-title">Đầu mục</h2><p>Quản lý danh mục tài liệu</p></div></div>
    <form className="library-category-create" onSubmit={(event) => { event.preventDefault(); if (newName.trim()) void run(async () => { await onCreate(newName.trim()); setNewName(''); }); }}>
      <Label className="form-field">Thêm đầu mục<Input value={newName} onChange={(event) => setNewName(event.target.value)} /></Label>
      <Button type="submit" disabled={busy || !newName.trim()}>Thêm</Button>
    </form>
    {error && <p role="alert" className="notice">{error}</p>}
    <ol className="library-category-list">{categories.map((category, index) => <li key={category.id}>
      {editing?.id === category.id ? <Input aria-label={`Tên đầu mục ${category.name}`} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /> : <span>{category.name}</span>}
      <div>
        <Button variant="catalog" size="sm" aria-label={`Chuyển ${category.name} lên`} disabled={busy || index === 0} onClick={() => void move(index, -1)}>↑</Button>
        <Button variant="catalog" size="sm" aria-label={`Chuyển ${category.name} xuống`} disabled={busy || index === categories.length - 1} onClick={() => void move(index, 1)}>↓</Button>
        {editing?.id === category.id ? <Button size="sm" disabled={busy} onClick={() => void run(async () => { await onUpdate(editing); setEditing(null); })}>Lưu</Button> : <Button variant="catalog" size="sm" onClick={() => setEditing(category)}>Đổi tên</Button>}
        <Button variant="catalog" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Xóa đầu mục “${category.name}”?`)) void run(() => onDelete(category.id)); }}>Xóa</Button>
      </div>
    </li>)}</ol>
  </section>;
}
