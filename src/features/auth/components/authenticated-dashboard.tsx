'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@components/ui/card';
import { authRepository } from '../auth-repository';

type AuthenticatedDashboardProps = Readonly<{ children: React.ReactNode }>;

export function AuthenticatedDashboard({ children }: AuthenticatedDashboardProps) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = authRepository.subscribeToSession((session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        return;
      }
      setHasSession(false);
      router.replace('/login');
    });

    void authRepository.getSession().then((session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        return;
      }
      router.replace('/login');
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (hasSession) return children;

  return <main className="auth-page" aria-busy="true"><Card className="auth-card"><p role="status">Đang kiểm tra phiên đăng nhập…</p></Card></main>;
}
