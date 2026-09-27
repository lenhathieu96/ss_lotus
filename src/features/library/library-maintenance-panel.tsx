'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LibraryAdminDocument } from './library-domain';

export function LibraryMaintenancePanel({ documents, onCleanup, onReconcileDelete, onRecoverUpload }: { documents: LibraryAdminDocument[]; onCleanup: () => Promise<void>; onReconcileDelete: (document: LibraryAdminDocument) => Promise<void>; onRecoverUpload: (document: LibraryAdminDocument) => Promise<string | void> }) {
  const [busyId, setBusyId] = useState(''); const [error, setError] = useState('');
  const pending = documents.filter((document) => document.status === 'pending' || document.status === 'cleaning' || document.status === 'deleting');
  if (!pending.length) return null;
  async function run(id: string, task: () => Promise<string | void>) { setBusyId(id); setError(''); try { const message = await task(); if (message) setError(message); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể xử lý lượt tải.'); } finally { setBusyId(''); } }
  return <section className="library-maintenance-panel" aria-labelledby="library-maintenance-title"><header><div><h2 id="library-maintenance-title">Upload cần xử lý</h2><p>{pending.length} lượt tải đang dàn xếp hoặc cần khôi phục.</p></div><Button variant="catalog" disabled={!!busyId} onClick={() => void run('cleanup', onCleanup)}>{busyId === 'cleanup' ? 'Đang dọn…' : 'Dọn lượt quá hạn'}</Button></header>{error && <p role="alert" className="notice">{error}</p>}<ul>{pending.map((document) => <li key={document.id}><div><strong>{document.title}</strong><small>{document.status === 'pending' ? 'Đang chờ dàn xếp' : document.status === 'cleaning' ? 'Đang dọn lượt tải' : 'Đang xử lý xóa'} · {document.originalFilename}</small></div>{document.status === 'deleting' ? <Button variant="catalog" size="sm" disabled={!!busyId} onClick={() => void run(document.id, () => onReconcileDelete(document))}>Kiểm tra trạng thái xóa</Button> : <Button variant="catalog" size="sm" disabled={!!busyId} onClick={() => void run(document.id, () => onRecoverUpload(document))}>{busyId === document.id ? 'Đang dàn xếp…' : 'Kiểm tra và dàn xếp'}</Button>}</li>)}</ul></section>;
}
