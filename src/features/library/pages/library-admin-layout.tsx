import { LibraryAdminGate } from '../components/library-admin-gate';
import { loadServerAuthBootstrap } from '@features/auth/server-auth-bootstrap';
import { redirect } from 'next/navigation';

export default async function LibraryAdminLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await loadServerAuthBootstrap();
  if (bootstrap.kind === 'unauthenticated') redirect('/login?returnTo=/admin/thu-vien');
  if (bootstrap.kind !== 'ready' || !bootstrap.isLibraryAdmin) {
    return <LibraryAdminGate initialAllowed={false}>{children}</LibraryAdminGate>;
  }
  return <LibraryAdminGate initialAllowed>{children}</LibraryAdminGate>;
}
