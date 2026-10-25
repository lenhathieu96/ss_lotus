'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authRepository, type AuthSession } from '../auth-repository';
import { PagodaAccessProvider } from '@features/pagodas/pagoda-access-context';
import { clearActivePagodaId, removeStoredActivePagodaId } from '@features/pagodas/pagoda-client';
import type { ReadyAuthBootstrap } from '../server-auth-bootstrap';
import { DashboardAccessProvider } from './dashboard-access-context';

type AuthenticatedDashboardProps = Readonly<{ children: React.ReactNode; initialBootstrap: ReadyAuthBootstrap }>;

export function AuthenticatedDashboard({ children, initialBootstrap }: AuthenticatedDashboardProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>({ userId: initialBootstrap.userId });
  const activeUserIdRef = useRef<string | null>(initialBootstrap.userId);

  useEffect(() => {
    let active = true;
    const unsubscribe = authRepository.subscribeToSession((nextSession) => {
      if (!active) return;
      if (nextSession) {
        if (activeUserIdRef.current && activeUserIdRef.current !== nextSession.userId) {
          clearActivePagodaId(activeUserIdRef.current);
          removeStoredActivePagodaId(activeUserIdRef.current);
          activeUserIdRef.current = null;
          setSession(null);
          router.replace('/overview');
          router.refresh();
          return;
        }
        activeUserIdRef.current = nextSession.userId;
        setSession(nextSession);
        return;
      }
      if (activeUserIdRef.current) removeStoredActivePagodaId(activeUserIdRef.current);
      clearActivePagodaId();
      activeUserIdRef.current = null;
      setSession(null);
      router.replace('/login');
      router.refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (session) return <DashboardAccessProvider access={{ userId: initialBootstrap.userId, isLibraryAdmin: initialBootstrap.isLibraryAdmin }}><PagodaAccessProvider key={session.userId} userId={session.userId} initialAccess={{ pagodas: initialBootstrap.pagodas, activePagoda: initialBootstrap.activePagoda }}>{children}</PagodaAccessProvider></DashboardAccessProvider>;

  return null;
}
