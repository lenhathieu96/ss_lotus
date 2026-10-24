'use client';

import { useRef, useState } from 'react';
import { Button } from '@components/ui/button';
import { getLibraryDownloadUrl } from '../library-repository';

export function LibraryDownloadButton({ documentId }: { documentId: string }) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const url = await getLibraryDownloadUrl(documentId);
      window.location.assign(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tải PDF. Vui lòng thử lại.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <span>
    <Button type="button" variant="catalog" onClick={() => void download()} disabled={busy} aria-busy={busy}>
      {busy ? 'Đang chuẩn bị PDF…' : error ? 'Thử tải PDF lại' : 'Tải PDF'}
    </Button>
    {error && <span role="alert">{error}</span>}
  </span>;
}
