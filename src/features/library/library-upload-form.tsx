'use client';

import { useEffect, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LibraryCategory, LibraryUploadTicket, defaultLibraryTitle, validatePdfMetadata } from './library-domain';
import { LibraryUploadProgress, startLibraryPdfUpload } from './library-upload-service';

export function LibraryUploadForm({ open, categories, onClose, onComplete }: { open: boolean; categories: LibraryCategory[]; onClose: () => void; onComplete: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [ticket, setTicket] = useState<LibraryUploadTicket | null>(null);
  const [progress, setProgress] = useState<LibraryUploadProgress | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const first = categories[0]?.id; if (first) setCategoryId((current) => categories.some((category) => category.id === current) ? current : first); }, [categories]);
  function reset() { setFile(null); setTitle(''); setAuthor(''); setProgress(null); setTicket(null); if (inputRef.current) inputRef.current.value = ''; }
  function selectFile(selected: File | null) { if (ticket) return; setFile(selected); if (selected && !title) setTitle(defaultLibraryTitle(selected.name)); setProgress(null); setError(''); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (ticket) return setError('Lượt tải trước đang được dàn xếp. Hãy dọn lượt quá hạn trước khi bắt đầu lại.');
    if (!file) return setError('Vui lòng chọn tệp PDF.');
    const validation = validatePdfMetadata({ title, author, categoryId, file });
    if (validation) return setError(validation);
    const controller = new AbortController(); abortRef.current = controller; setSaving(true); setError('');
    try { await startLibraryPdfUpload({ file, title, author, categoryId, onProgress: setProgress, onPrepared: setTicket, signal: controller.signal }); reset(); await onComplete(); onClose(); }
    catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Không thể tải tài liệu lên.'} Lượt tải này phải được dàn xếp trước khi bắt đầu lại.`); }
    finally { abortRef.current = null; setSaving(false); }
  }
  return <Sheet open={open} onOpenChange={(next) => { if (!next && !saving) onClose(); }}><SheetContent side="right" showCloseButton={!saving} className="library-upload-sheet"><SheetHeader><p className="eyebrow">THƯ VIỆN</p><SheetTitle>Thêm tài liệu PDF</SheetTitle><p>Tối đa 100 MB. Lỗi tải lên phải bắt đầu lại từ đầu.</p></SheetHeader><form className="library-upload-form" onSubmit={(event) => void submit(event)}><div className="library-file-picker"><span>Tệp PDF</span><input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" aria-label="Chọn tệp PDF" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" disabled={saving || !!ticket} onClick={() => inputRef.current?.click()}><FileUp aria-hidden="true" /> Chọn tệp PDF</Button></div><Label className="form-field">Tên tài liệu<Input required value={title} disabled={saving || !!ticket} onChange={(event) => setTitle(event.target.value)} /></Label><Label className="form-field">Tác giả (không bắt buộc)<Input value={author} disabled={saving || !!ticket} onChange={(event) => setAuthor(event.target.value)} /></Label><Label className="form-field">Đầu mục<select required value={categoryId} disabled={saving || !!ticket} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Label>{file && <p className="library-file-name">{file.name}</p>}{progress && <UploadProgress progress={progress} />}{error && <p role="alert" className="notice">{error}</p>}<SheetFooter><Button type="button" variant="catalog" disabled={!!ticket && !saving} onClick={() => saving ? abortRef.current?.abort() : reset()}>{saving ? 'Dừng và dọn lượt tải' : ticket ? 'Đang dàn xếp' : 'Xóa lựa chọn'}</Button><Button type="submit" disabled={saving || !file || !!ticket}>{saving ? 'Đang tải lên…' : 'Tải lên và công khai'}</Button></SheetFooter></form></SheetContent></Sheet>;
}

export function UploadProgress({ progress }: { progress: LibraryUploadProgress }) {
  return <div className="library-upload-progress"><div><span>Tiến trình</span><strong>{progress.percent}%</strong></div><progress aria-label="Tiến trình tải PDF" value={progress.uploadedBytes} max={Math.max(progress.totalBytes, 1)} /></div>;
}
