'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { isLibraryAdmin } from './library-repository';

export function LibraryAdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  useEffect(() => {
    let active = true;
    void isLibraryAdmin().then((allowed) => { if (active) setState(allowed ? 'allowed' : 'denied'); })
      .catch(() => { if (active) setState('denied'); });
    return () => { active = false; };
  }, []);
  if (state === 'allowed') return children;
  return <main className="auth-page" aria-busy={state === 'checking'}><Card className="auth-card">{state === 'checking' ? <p role="status">Đang kiểm tra quyền quản trị…</p> : <div><h1>Không có quyền quản lý</h1><p role="alert">Tài khoản hiện tại không được cấp quyền quản trị thư viện.</p></div>}</Card></main>;
}
