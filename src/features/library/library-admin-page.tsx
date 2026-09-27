'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LibraryAdminDocument, LibraryCategory } from './library-domain';
import { createLibraryCategory, deleteLibraryCategory, listLibraryCategories, listLibraryDocumentsAdmin, reorderLibraryCategories, updateLibraryCategory, updateLibraryDocument } from './library-repository';
import { cleanupLibraryS3Uploads, deleteLibraryS3Document, reconcileLibraryS3Document, recoverLibraryS3Upload } from './library-storage-api';
import { LibraryBatchUploadDialog } from './library-batch-upload-dialog';
import { LibraryCategoryManager } from './library-category-manager';
import { LibraryDocumentEditor } from './library-document-editor';
import { LibraryMaintenancePanel } from './library-maintenance-panel';
import { LibraryUploadForm } from './library-upload-form';

export function LibraryAdminPage() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [documents, setDocuments] = useState<LibraryAdminDocument[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [singleOpen, setSingleOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryAdminDocument | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [categoryRows, documentRows] = await Promise.all([listLibraryCategories(), listLibraryDocumentsAdmin()]);
      setCategories(categoryRows); setDocuments(documentRows); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải thư viện.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function cleanupExpired() {
    await cleanupLibraryS3Uploads();
    await reload();
  }

  async function deleteDocument(document: LibraryAdminDocument) {
    if (!window.confirm(`Xóa “${document.title}”?`)) return;
    setError('');
    try {
      await deleteLibraryS3Document(document.id);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa tài liệu.'); await reload(); }
  }

  const visible = documents.filter((document) => `${document.title} ${document.author ?? ''} ${document.originalFilename}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN')));

  return <section className="page library-admin-page">
    <header className="page-heading"><div><p className="eyebrow">THƯ VIỆN</p><h1>Quản lý tài liệu</h1><p>Đầu mục, tài liệu PDF và các lượt tải lên.</p></div><div className="catalog-page-actions"><Button variant="catalog" onClick={() => setBatchOpen(true)}>Import nhiều PDF</Button><Button onClick={() => setSingleOpen(true)}>Thêm tài liệu</Button></div></header>
    <aside className="library-capacity-notice" role="note"><strong>PDF tối đa 100 MB mỗi tệp.</strong><span>Tải lên không thể tiếp tục sau khi lỗi; hãy dọn lượt tải rồi bắt đầu lại từ đầu.</span></aside>
    {error && <p role="alert" className="notice">{error}</p>}
    <LibraryMaintenancePanel documents={documents} onCleanup={cleanupExpired} onReconcileDelete={async (document) => { await reconcileLibraryS3Document(document.id); await reload(); }} onRecoverUpload={async (document) => { const result = await recoverLibraryS3Upload(document.id); if (result.status === 'published' || result.status === 'reupload_required') await reload(); return result.message; }} />
    <LibraryCategoryManager categories={categories} onCreate={async (name) => { await createLibraryCategory(name); await reload(); }} onUpdate={async (category) => { await updateLibraryCategory(category); await reload(); }} onReorder={async (ids) => { await reorderLibraryCategories(ids); await reload(); }} onDelete={async (id) => { await deleteLibraryCategory(id); await reload(); }} />
    <Card className="catalog-list"><div className="catalog-list-heading"><div><h2>Danh sách tài liệu</h2><p>{documents.filter((document) => document.status === 'published').length} tài liệu đã công khai</p></div><Label className="catalog-search">Tìm tài liệu<Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></Label></div>
      {loading ? <p role="status">Đang tải danh sách…</p> : visible.length === 0 ? <p className="empty-panel">Chưa có tài liệu.</p> : <div className="catalog-table-wrap"><Table><TableHeader><TableRow><TableHead>Tên tài liệu</TableHead><TableHead>Tác giả</TableHead><TableHead>Đầu mục</TableHead><TableHead>Trạng thái</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader><TableBody>{visible.map((document) => <TableRow key={document.id}><TableCell>{document.title}<small>{document.originalFilename}</small></TableCell><TableCell>{document.author || '—'}</TableCell><TableCell>{document.categoryName}</TableCell><TableCell>{document.status === 'published' ? 'Công khai' : document.status === 'pending' ? 'Đang chờ' : document.status === 'cleaning' ? 'Đang dọn' : 'Đang xóa'}</TableCell><TableCell className="catalog-actions">{document.status === 'published' && <><Button asChild size="sm" variant="outline"><Link href={`/thu-vien/${document.id}`}>Xem</Link></Button><Button size="sm" onClick={() => setEditing(document)}>Sửa</Button><Button variant="catalog" size="sm" onClick={() => void deleteDocument(document)}>Xóa</Button></>}</TableCell></TableRow>)}</TableBody></Table></div>}
    </Card>
    <LibraryUploadForm open={singleOpen} categories={categories} onClose={() => setSingleOpen(false)} onComplete={reload} />
    <LibraryBatchUploadDialog open={batchOpen} categories={categories} onClose={() => setBatchOpen(false)} onComplete={reload} />
    {editing && <LibraryDocumentEditor document={editing} categories={categories} onClose={() => setEditing(null)} onSave={async (value) => { await updateLibraryDocument(value); setEditing(null); await reload(); }} />}
  </section>;
}
