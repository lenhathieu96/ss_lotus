'use client';

import { DashboardShell } from '@features/dashboard/components/dashboard-shell';

export function PublicLibraryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardShell publicLibrary>{children}</DashboardShell>;
}
