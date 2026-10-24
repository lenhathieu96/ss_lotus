'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  activePagodaStorageKey,
  clearActivePagodaId,
  listMyPagodas,
  removeStoredActivePagodaId,
  setActivePagodaId,
  setActivePagodaMemory,
  storedActivePagodaId,
  type PagodaAccess,
} from './pagoda-client';

type PagodaAccessContextValue = Readonly<{
  activePagoda: PagodaAccess;
  pagodas: PagodaAccess[];
  selectPagoda: (pagodaId: string) => void;
}>;

const PagodaAccessContext = createContext<PagodaAccessContextValue | null>(null);

type PagodaAccessProviderProps = Readonly<{ children: ReactNode; userId: string }>;

type AccessState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'error'; message: string }>
  | Readonly<{ kind: 'empty' }>
  | Readonly<{ kind: 'ready'; pagodas: PagodaAccess[]; activePagoda: PagodaAccess }>;

function selectAuthorizedPagoda(pagodas: PagodaAccess[], storedId: string | null): PagodaAccess | undefined {
  return pagodas.find((pagoda) => pagoda.id === storedId) ?? pagodas[0];
}

export function PagodaAccessProvider({ children, userId }: PagodaAccessProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AccessState>({ kind: 'loading' });
  const requestVersionRef = useRef(0);

  const loadPagodas = useCallback(async (navigateAfterLoad: boolean) => {
    const requestVersion = ++requestVersionRef.current;
    setState({ kind: 'loading' });
    clearActivePagodaId(userId);

    try {
      const pagodas = await listMyPagodas();
      if (requestVersion !== requestVersionRef.current) return;
      const savedPagodaId = storedActivePagodaId(userId);
      const selected = selectAuthorizedPagoda(pagodas, savedPagodaId);

      if (!selected) {
        removeStoredActivePagodaId(userId);
        setState({ kind: 'empty' });
        return;
      }

      setActivePagodaMemory(userId, selected.id);
      if (selected.id !== savedPagodaId) setActivePagodaId(userId, selected.id);
      setState({ kind: 'ready', pagodas, activePagoda: selected });
      if (navigateAfterLoad) router.replace('/overview');
    } catch (error) {
      if (requestVersion !== requestVersionRef.current) return;
      clearActivePagodaId(userId);
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Không thể tải danh sách chùa.' });
    }
  }, [router, userId]);

  useEffect(() => {
    void loadPagodas(false);
    return () => {
      requestVersionRef.current += 1;
      clearActivePagodaId(userId);
    };
  }, [loadPagodas, userId]);

  useEffect(() => {
    const storageKey = activePagodaStorageKey(userId);
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || event.key !== storageKey) return;
      void loadPagodas(true);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadPagodas, userId]);

  useEffect(() => {
    const revalidateAccess = () => void loadPagodas(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidateAccess();
    };
    window.addEventListener('focus', revalidateAccess);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', revalidateAccess);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [loadPagodas]);

  const selectPagoda = useCallback((pagodaId: string) => {
    if (state.kind !== 'ready') return;
    const selected = state.pagodas.find((pagoda) => pagoda.id === pagodaId);
    if (!selected || selected.id === state.activePagoda.id) return;

    setActivePagodaId(userId, selected.id);
    setState({ ...state, activePagoda: selected });
    router.replace('/overview');
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

  return <PagodaAccessContext.Provider value={{ activePagoda: state.activePagoda, pagodas: state.pagodas, selectPagoda }}>{children}</PagodaAccessContext.Provider>;
}

export function usePagodaAccess(): PagodaAccessContextValue {
  const context = useContext(PagodaAccessContext);
  if (!context) throw new Error('PagodaAccessProvider phải bọc màn hình quản trị.');
  return context;
}
