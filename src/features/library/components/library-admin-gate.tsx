'use client';

import { useEffect, useState } from 'react';
import { Card } from '@components/ui/card';
import { isLibraryAdmin } from '../library-repository';

export function LibraryAdminGate({ children, initialAllowed = false }: { children: React.ReactNode; initialAllowed?: boolean }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>(initialAllowed ? 'allowed' : 'checking');
  useEffect(() => {
    let active = true;
    let timer: number | null = null;
    const revalidate = () => {
      void isLibraryAdmin().then((allowed) => {
        if (!active) return;
        if (!allowed) {
          window.dispatchEvent(new Event('ss-lotus:library-admin-revoked'));
          setState('denied');
        } else {
          setState('allowed');
        }
      }).catch(() => {
        // Do not throw away an in-progress draft for a transport failure.
        if (active && !initialAllowed) setState('denied');
      });
    };
    revalidate();
    const onFocus = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(revalidate, 150);
    };
    const onRevoked = () => {
      if (timer) window.clearTimeout(timer);
      if (active) setState('denied');
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('ss-lotus:library-admin-revoked', onRevoked);
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('ss-lotus:library-admin-revoked', onRevoked);
    };
  }, [initialAllowed]);
  if (state === 'allowed') return children;
  return <main className="auth-page" aria-busy={state === 'checking'}><Card className="auth-card">{state === 'checking' ? <p role="status">Đang kiểm tra quyền quản trị…</p> : <div><h1>Không có quyền quản lý</h1><p role="alert">Tài khoản hiện tại không được cấp quyền quản trị thư viện.</p></div>}</Card></main>;
}
