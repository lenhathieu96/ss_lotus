'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LibraryAdminDocument, LibraryCategory } from './library-domain';

export function LibraryDocumentEditor({ document, categories, onSave, onClose }: {
  document: LibraryAdminDocument;
  categories: LibraryCategory[];
  onSave: (value: Pick<LibraryAdminDocument, 'id' | 'categoryId' | 'title' | 'author'>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const [author, setAuthor] = useState(document.author ?? '');
  const [categoryId, setCategoryId] = useState(document.categoryId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
    <DialogContent className="library-dialog"><DialogHeader><DialogTitle>Chỉnh sửa tài liệu</DialogTitle><p>{document.originalFilename}</p></DialogHeader>
      <form onSubmit={(event) => { event.preventDefault(); setSaving(true); setError(''); void onSave({ id: document.id, categoryId, title, author: author.trim() || null }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Không thể lưu tài liệu.')).finally(() => setSaving(false)); }}>
        <Label className="form-field">Tên tài liệu<Input required value={title} onChange={(event) => setTitle(event.target.value)} /></Label>
        <Label className="form-field">Tác giả (không bắt buộc)<Input value={author} onChange={(event) => setAuthor(event.target.value)} /></Label>
        <Label className="form-field">Đầu mục<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Label>
        {error && <p className="notice" role="alert">{error}</p>}
        <DialogFooter><Button type="button" variant="catalog" disabled={saving} onClick={onClose}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
