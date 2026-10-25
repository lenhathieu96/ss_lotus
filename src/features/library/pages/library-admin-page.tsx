'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@components/ui/button';
import { BookOpen, Settings2 } from 'lucide-react';
import { LibraryAdminDocument, LibraryCategory } from '../library-repository';
import { createLibraryCategory, deleteLibraryCategory, listLibraryCategories, listLibraryDocumentsAdmin, reorderLibraryCategories, updateLibraryCategory, updateLibraryDocument } from '../library-repository';
import { cleanupLibraryUploads, deleteLibraryDocument, reconcileLibraryDocument, recoverLibraryUpload } from '../library-repository';
import { LibraryBatchUploadDialog } from '../components/library-batch-upload-dialog';
import { LibraryCategoryManager } from '../components/library-category-manager';
import { LibraryDocumentEditor } from '../components/library-document-editor';
import { LibraryMaintenancePanel } from '../components/library-maintenance-panel';
import { LibraryUploadForm } from '../components/library-upload-form';
import { LibraryAdminCatalog } from '../components/library-admin-catalog';

export function LibraryAdminPage() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [documents, setDocuments] = useState<LibraryAdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [singleOpen, setSingleOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryAdminDocument | null>(null);
  const [managementOpen, setManagementOpen] = useState(false);

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
    await cleanupLibraryUploads();
    await reload();
  }

  async function deleteDocument(document: LibraryAdminDocument) {
    if (!window.confirm(`Xóa “${document.title}”?`)) return;
    setError('');
    try {
      await deleteLibraryDocument(document.id);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa tài liệu.'); await reload(); }
  }

  return <section className="page library-admin-page">
    <header className="library-browse-header"><div><p className="eyebrow">THƯ VIỆN · SS LOTUS</p><h1>Khám phá thư viện</h1><p>Tìm sách, chọn đầu mục và mở những trang tri thức.</p><div className="library-browse-summary"><span><BookOpen size={16} aria-hidden="true" /> {documents.filter((document) => document.status === 'published').length} tài liệu</span><span>{categories.length} đầu mục</span></div></div><Button asChild variant="catalog"><Link href="#library-management" onClick={() => setManagementOpen(true)}><Settings2 size={16} aria-hidden="true" /> Công cụ quản lý</Link></Button></header>
    {error && <p role="alert" className="notice">{error} <Button variant="catalog" onClick={() => void reload()}>Thử lại</Button></p>}
    <LibraryAdminCatalog categories={categories} documents={documents} loading={loading} onEdit={setEditing} onDelete={(document) => void deleteDocument(document)} />
    <details id="library-management" className="library-management-tools" open={managementOpen} onToggle={(event) => setManagementOpen(event.currentTarget.open)}>
    <summary><Settings2 size={18} aria-hidden="true" /> Quản lý thư viện{documents.some((document) => document.status !== 'published') && <span> · {documents.filter((document) => document.status !== 'published').length} lượt cần xử lý</span>}</summary>
    <div className="catalog-page-actions"><Button variant="catalog" onClick={() => setSingleOpen(true)}>Thêm tài liệu</Button><Button variant="catalog" onClick={() => setBatchOpen(true)}>Import nhiều PDF</Button></div>
    <aside className="library-capacity-notice" role="note"><strong>PDF tối đa 100 MB mỗi tệp.</strong><span>Tải lên không thể tiếp tục sau khi lỗi; hãy dọn lượt tải rồi bắt đầu lại từ đầu.</span></aside>
    <LibraryMaintenancePanel documents={documents} onCleanup={cleanupExpired} onReconcileDelete={async (document) => { await reconcileLibraryDocument(document.id); await reload(); }} onRecoverUpload={async (document) => { const result = await recoverLibraryUpload(document.id); if (result.status === 'published' || result.status === 'reupload_required') await reload(); return result.message; }} />
    <LibraryCategoryManager categories={categories} onCreate={async (name) => { await createLibraryCategory(name); await reload(); }} onUpdate={async (category) => { await updateLibraryCategory(category); await reload(); }} onReorder={async (ids) => { await reorderLibraryCategories(ids); await reload(); }} onDelete={async (id) => { await deleteLibraryCategory(id); await reload(); }} />
    </details>
    <LibraryUploadForm open={singleOpen} categories={categories} onClose={() => setSingleOpen(false)} onComplete={reload} />
    <LibraryBatchUploadDialog open={batchOpen} categories={categories} onClose={() => setBatchOpen(false)} onComplete={reload} />
    {editing && <LibraryDocumentEditor document={editing} categories={categories} onClose={() => setEditing(null)} onSave={async (value) => { await updateLibraryDocument(value); setEditing(null); await reload(); }} />}
  </section>;
}
