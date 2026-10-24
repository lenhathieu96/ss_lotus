import { LibraryAdminGate } from '../components/library-admin-gate';

export default function LibraryAdminLayout({ children }: { children: React.ReactNode }) {
  return <LibraryAdminGate>{children}</LibraryAdminGate>;
}
