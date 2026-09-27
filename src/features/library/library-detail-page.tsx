'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LibraryDocument } from './library-domain';
import { getLibraryDocument } from './library-repository';
import { LibraryPdfReader } from './library-pdf-reader';
import { libraryDownloadUrl, publicLibraryDocumentUrl } from './library-storage-api';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function LibraryDetailPage({ documentId }: { documentId: string }) {
  const [document, setDocument] = useState<LibraryDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!uuidPattern.test(documentId)) { setUnavailable(true); setLoading(false); return; }
    let active = true;
    void getLibraryDocument(documentId).then((record) => {
      if (!active) return;
      setDocument(record);
      setUnavailable(!record);
    }).catch(() => { if (active) setUnavailable(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  const handlePdfUnavailable = useCallback(async () => {
    if (!document) return;
    const latest = await getLibraryDocument(document.id).catch(() => document);
    if (!latest) {
      setDocument(null);
      setUnavailable(true);
    }
  }, [document]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setShareError(null);
    } catch {
      setShareError('Không thể sao chép liên kết trên trình duyệt này.');
    }
  }

  if (loading) return <main className="page"><p role="status">Đang tải tài liệu…</p></main>;
  if (unavailable || !document) return <main className="page"><Card className="empty-panel"><h1>Không tìm thấy tài liệu</h1><p>Tài liệu có thể đã bị xóa hoặc đường dẫn không hợp lệ.</p><Link href="/thu-vien">Quay lại thư viện</Link></Card></main>;
  const downloadUrl = libraryDownloadUrl(document.id);
  let previewUrl: string | null = null;
  let readerConfigurationError: string | null = null;
  try {
    previewUrl = publicLibraryDocumentUrl(document.id);
  } catch {
    readerConfigurationError = 'Trình đọc trực tuyến chưa được cấu hình. Bạn vẫn có thể tải PDF xuống.';
  }

  return <main className="page library-detail-page">
    <Link href="/thu-vien" className="library-back-link">← Thư viện</Link>
    <header className="library-detail-heading"><div><p className="eyebrow">{document.categoryName}</p><h1>{document.title}</h1><p>{document.author ? `Tác giả: ${document.author}` : 'Chưa cập nhật tác giả'}</p></div><div><Button variant="catalog" onClick={() => void copyLink()}>{copied ? 'Đã sao chép liên kết' : 'Chia sẻ'}</Button><a className="button-download" href={downloadUrl}>Tải PDF</a></div></header>
    {shareError && <p className="notice" role="alert">{shareError}</p>}
    {previewUrl
      ? <LibraryPdfReader downloadUrl={downloadUrl} onPdfUnavailable={handlePdfUnavailable} pdfUrl={previewUrl} title={document.title} />
      : <Card className="library-reader-configuration" role="alert"><h2>Chưa thể mở trình đọc trực tuyến</h2><p>{readerConfigurationError}</p><a className="button-download" href={downloadUrl}>Tải PDF</a></Card>}
  </main>;
}
