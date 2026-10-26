'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { LibraryManagementDialog } from '../components/library-management-dialog';

export function LibraryAdminPage() {
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [documents, setDocuments] = useState<LibraryAdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [singleOpen, setSingleOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryAdminDocument | null>(null);
  const [managementOpen, setManagementOpen] = useState(false);
  const [managementBusy, setManagementBusy] = useState(false);
  const managementTrigger = useRef<HTMLButtonElement>(null);
  const hadManagementDialog = useRef(false);

  useEffect(() => {
    if (managementOpen || singleOpen || batchOpen) { hadManagementDialog.current = true; return; }
    if (!hadManagementDialog.current) return;
    const frame = requestAnimationFrame(() => managementTrigger.current?.focus());
    hadManagementDialog.current = false;
    return () => cancelAnimationFrame(frame);
  }, [managementOpen, singleOpen, batchOpen]);

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

  async function manage<T,>(action: () => Promise<T>): Promise<T> {
    setManagementBusy(true);
    try { return await action(); }
    finally { setManagementBusy(false); }
  }

  const pendingCount = documents.filter((document) => ['pending', 'cleaning', 'deleting'].includes(document.status)).length;

  async function deleteDocument(document: LibraryAdminDocument) {
    if (!window.confirm(`Xóa “${document.title}”?`)) return;
    setError('');
    try {
      await deleteLibraryDocument(document.id);
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xóa tài liệu.'); await reload(); }
  }

  return <section className="page library-admin-page">
    <h1 className="sr-only">Khám phá thư viện</h1>
    <div className="library-browse-toolbar"><div className="library-browse-summary"><span><BookOpen size={16} aria-hidden="true" /> {documents.filter((document) => document.status === 'published').length} tài liệu</span><span>{categories.length} đầu mục</span></div></div>
    {error && <p role="alert" className="notice">{error} <Button variant="catalog" onClick={() => void reload()}>Thử lại</Button></p>}
    <LibraryAdminCatalog searchAction={<Button ref={managementTrigger} variant="catalog" onClick={() => setManagementOpen(true)}><Settings2 size={16} aria-hidden="true" /> Quản lý thư viện{pendingCount > 0 && <span className="library-pending-count">{pendingCount}<span className="sr-only"> lượt cần xử lý</span></span>}</Button>} categories={categories} documents={documents} loading={loading} onEdit={setEditing} onDelete={(document) => void deleteDocument(document)} />
    {managementOpen && <LibraryManagementDialog onClose={() => setManagementOpen(false)} busy={managementBusy} pendingCount={pendingCount}
      onSingleUpload={() => { setManagementOpen(false); setSingleOpen(true); }}
      onBatchUpload={() => { setManagementOpen(false); setBatchOpen(true); }}
      uploads={<LibraryMaintenancePanel documents={documents} onCleanup={() => manage(cleanupExpired)} onReconcileDelete={(document) => manage(async () => { await reconcileLibraryDocument(document.id); await reload(); })} onRecoverUpload={(document) => manage(async () => { const result = await recoverLibraryUpload(document.id); if (result.status === 'published' || result.status === 'reupload_required') await reload(); return result.message; })} />}
      categories={<LibraryCategoryManager categories={categories} onCreate={(name) => manage(async () => { await createLibraryCategory(name); await reload(); })} onUpdate={(category) => manage(async () => { await updateLibraryCategory(category); await reload(); })} onReorder={(ids) => manage(async () => { await reorderLibraryCategories(ids); await reload(); })} onDelete={(id) => manage(async () => { await deleteLibraryCategory(id); await reload(); })} />}
    />}
    <LibraryUploadForm open={singleOpen} categories={categories} onClose={() => setSingleOpen(false)} onComplete={reload} />
    <LibraryBatchUploadDialog open={batchOpen} categories={categories} onClose={() => setBatchOpen(false)} onComplete={reload} />
    {editing && <LibraryDocumentEditor document={editing} categories={categories} onClose={() => setEditing(null)} onSave={async (value) => { await updateLibraryDocument(value); setEditing(null); await reload(); }} />}
  </section>;
}
