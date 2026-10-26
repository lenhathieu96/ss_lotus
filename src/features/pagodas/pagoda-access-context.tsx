'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticationFailure, isPermissionFailure } from '@lib/supabase/auth-errors';
import {
  clearActivePagodaId,
  listMyPagodas,
  removeStoredActivePagodaId,
  setActivePagodaId,
  setActivePagodaMemory,
  storedActivePagodaId,
  subscribeToActivePagodaChange,
  type PagodaAccess,
} from './pagoda-client';

type PagodaAccessContextValue = Readonly<{
  activePagoda: PagodaAccess;
  pagodas: PagodaAccess[];
  selectPagoda: (pagodaId: string) => void;
}>;

export type InitialPagodaAccess = Readonly<{ pagodas: PagodaAccess[]; activePagoda: PagodaAccess }>;

const PagodaAccessContext = createContext<PagodaAccessContextValue | null>(null);

type PagodaAccessProviderProps = Readonly<{ children: ReactNode; userId: string; initialAccess?: InitialPagodaAccess }>;
type ConfirmedAccess = Readonly<{ pagodas: PagodaAccess[]; activePagoda: PagodaAccess }>;
type AccessState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error'; message: string }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'revalidating'; access: ConfirmedAccess }>
  | Readonly<{ kind: 'network-error'; access: ConfirmedAccess; message: string }>
  | Readonly<{ kind: 'ready'; access: ConfirmedAccess }>;

function selectAuthorizedPagoda(pagodas: PagodaAccess[], selectedId: string | null): PagodaAccess | undefined {
  return pagodas.find((pagoda) => pagoda.id === selectedId) ?? pagodas[0];
}

function verifiedInitialAccess(userId: string, initialAccess?: InitialPagodaAccess): AccessState {
  if (!initialAccess) return { kind: 'loading' };
  const selected = selectAuthorizedPagoda(initialAccess.pagodas, initialAccess.activePagoda.id);
  if (!selected) return { kind: 'empty' };
  // Child effects only run after hydration. Keep server rendering free from global mutations.
  if (typeof window !== 'undefined') setActivePagodaMemory(userId, selected.id);
  return { kind: 'ready', access: { pagodas: initialAccess.pagodas, activePagoda: selected } };
}

function confirmedAccess(state: AccessState): ConfirmedAccess | null {
  return state.kind === 'ready' || state.kind === 'revalidating' || state.kind === 'network-error' ? state.access : null;
}

function isConfirmedRevocation(error: unknown): boolean {
  return isAuthenticationFailure(error) || isPermissionFailure(error);
}

export function PagodaAccessProvider({ children, userId, initialAccess }: PagodaAccessProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>(() => verifiedInitialAccess(userId, initialAccess));
  const requestRef = useRef<Promise<void> | null>(null);
  const requestVersionRef = useRef(0);
  const preferenceSyncedRef = useRef(false);
  const revalidationTimerRef = useRef<number | null>(null);

  const loadPagodas = useCallback((navigateAfterLoad: boolean) => {
    if (requestRef.current) return requestRef.current;
    const requestVersion = ++requestVersionRef.current;
    setState((current) => {
      const access = confirmedAccess(current);
      return access ? { kind: 'revalidating', access } : { kind: 'loading' };
    });

    const request = listMyPagodas().then((pagodas) => {
      if (requestVersion !== requestVersionRef.current) return;
      const savedPagodaId = storedActivePagodaId(userId);
      const selected = selectAuthorizedPagoda(pagodas, savedPagodaId);
      if (!selected) {
        removeStoredActivePagodaId(userId);
        clearActivePagodaId(userId);
        setState({ kind: 'empty' });
        return;
      }
      setActivePagodaMemory(userId, selected.id);
      if (selected.id !== savedPagodaId) setActivePagodaId(userId, selected.id);
      setState({ kind: 'ready', access: { pagodas, activePagoda: selected } });
      if (navigateAfterLoad) {
        router.replace('/overview');
        router.refresh();
      }
    }).catch((error: unknown) => {
      if (requestVersion !== requestVersionRef.current) return;
      if (isConfirmedRevocation(error)) {
        removeStoredActivePagodaId(userId);
        clearActivePagodaId(userId);
        setState({ kind: 'empty' });
        return;
      }
      const message = error instanceof Error ? error.message : 'Không thể tải danh sách chùa.';
      setState((current) => {
        const access = confirmedAccess(current);
        return access ? { kind: 'network-error', access, message } : { kind: 'error', message };
      });
    }).finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
    requestRef.current = request;
    return request;
  }, [router, userId]);

  useEffect(() => {
    void loadPagodas(false);
    return () => {
      requestVersionRef.current += 1;
      requestRef.current = null;
      clearActivePagodaId(userId);
    };
  }, [loadPagodas, userId]);

  useEffect(() => {
    if (preferenceSyncedRef.current || state.kind !== 'ready') return;
    preferenceSyncedRef.current = true;
    if (storedActivePagodaId(userId) !== state.access.activePagoda.id) setActivePagodaId(userId, state.access.activePagoda.id);
  }, [state, userId]);

  useEffect(() => subscribeToActivePagodaChange(userId, () => void loadPagodas(true)), [loadPagodas, userId]);

  useEffect(() => {
    const revalidateAccess = () => {
      if (revalidationTimerRef.current !== null) return;
      revalidationTimerRef.current = window.setTimeout(() => {
        revalidationTimerRef.current = null;
        void loadPagodas(false);
      }, 100);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidateAccess();
    };
    window.addEventListener('focus', revalidateAccess);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', revalidateAccess);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (revalidationTimerRef.current !== null) window.clearTimeout(revalidationTimerRef.current);
    };
  }, [loadPagodas]);

  const selectPagoda = useCallback((pagodaId: string) => {
    const access = confirmedAccess(state);
    if (!access) return;
    const selected = access.pagodas.find((pagoda) => pagoda.id === pagodaId);
    if (!selected || selected.id === access.activePagoda.id) return;
    setActivePagodaId(userId, selected.id);
    setState({ kind: 'ready', access: { ...access, activePagoda: selected } });
    router.replace('/overview');
    router.refresh();
  }, [router, state, userId]);

  if (state.kind === 'loading') {
    return <main className="auth-page" aria-busy="true"><p role="status">Đang tải quyền truy cập chùa…</p></main>;
  }
  if (state.kind === 'error') {
    return <main className="auth-page"><section className="auth-card"><p role="alert">Không thể tải danh sách chùa: {state.message}</p><button type="button" onClick={() => void loadPagodas(false)}>Thử lại</button></section></main>;
  }
  if (state.kind === 'empty') {
    return <main className="auth-page"><section className="auth-card"><p role="status">Tài khoản này chưa được cấp quyền vào chùa nào.</p><button type="button" onClick={() => void loadPagodas(false)}>Thử lại</button></section></main>;
  }

  return <PagodaAccessContext.Provider value={{ activePagoda: state.access.activePagoda, pagodas: state.access.pagodas, selectPagoda }}>
    {state.kind === 'network-error' && <p role="alert">Không thể cập nhật quyền truy cập: {state.message} <button type="button" onClick={() => void loadPagodas(false)}>Thử lại</button></p>}
    {children}
  </PagodaAccessContext.Provider>;
}

export function usePagodaAccess(): PagodaAccessContextValue {
  const context = useContext(PagodaAccessContext);
  if (!context) throw new Error('PagodaAccessProvider phải bọc màn hình quản trị.');
  return context;
}
