'use client';

import { createContext, useContext } from 'react';

type DashboardAccess = Readonly<{ userId: string; isLibraryAdmin: boolean }>;

const DashboardAccessContext = createContext<DashboardAccess | null>(null);

export function DashboardAccessProvider({ access, children }: Readonly<{ access: DashboardAccess; children: React.ReactNode }>) {
  return <DashboardAccessContext.Provider value={access}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess(): DashboardAccess | null {
  return useContext(DashboardAccessContext);
}
