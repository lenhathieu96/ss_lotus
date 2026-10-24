'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@components/ui/card';
import { authRepository, type AuthSession } from '../auth-repository';
import { PagodaAccessProvider } from '@features/pagodas/pagoda-access-context';
import { clearActivePagodaId } from '@features/pagodas/pagoda-client';

type AuthenticatedDashboardProps = Readonly<{ children: React.ReactNode }>;

export function AuthenticatedDashboard({ children }: AuthenticatedDashboardProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = authRepository.subscribeToSession((nextSession) => {
      if (!active) return;
      if (nextSession) {
        if (activeUserIdRef.current && activeUserIdRef.current !== nextSession.userId) clearActivePagodaId();
        activeUserIdRef.current = nextSession.userId;
        setSession(nextSession);
        return;
      }
      clearActivePagodaId();
      activeUserIdRef.current = null;
      setSession(null);
      router.replace('/login');
    });

    void authRepository.getSession().then((currentSession) => {
      if (!active) return;
      if (currentSession) {
        activeUserIdRef.current = currentSession.userId;
        setSession(currentSession);
        return;
      }
      router.replace('/login');
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (session) return <PagodaAccessProvider key={session.userId} userId={session.userId}>{children}</PagodaAccessProvider>;

  return <main className="auth-page" aria-busy="true"><Card className="auth-card"><p role="status">Đang kiểm tra phiên đăng nhập…</p></Card></main>;
}
