import { DashboardShell } from '../components/dashboard-shell';
import { AuthenticatedDashboard } from '@features/auth/components/authenticated-dashboard';
import { AuthAccessError, EmptyPagodaAccess } from '@features/auth/components/auth-access-error';
import { loadServerAuthBootstrap } from '@features/auth/server-auth-bootstrap';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const bootstrap = await loadServerAuthBootstrap();
  if (bootstrap.kind === 'unauthenticated') redirect('/login');
  if (bootstrap.kind === 'error') return <AuthAccessError />;
  if (bootstrap.kind === 'empty-access') return <EmptyPagodaAccess />;
  return <AuthenticatedDashboard initialBootstrap={bootstrap}><DashboardShell>{children}</DashboardShell></AuthenticatedDashboard>;
}
