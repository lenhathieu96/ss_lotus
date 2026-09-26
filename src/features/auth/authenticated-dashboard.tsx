'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

type AuthenticatedDashboardProps = Readonly<{ children: React.ReactNode }>;

export function AuthenticatedDashboard({ children }: AuthenticatedDashboardProps) {
  const router = useRouter();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        return;
      }
      setHasSession(false);
      router.replace('/login');
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        return;
      }
      router.replace('/login');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (hasSession) return children;

  return <main className="auth-page" aria-busy="true"><Card className="auth-card"><p role="status">Đang kiểm tra phiên đăng nhập…</p></Card></main>;
}
