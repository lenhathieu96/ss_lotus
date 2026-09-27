import { LibraryAdminGate } from '@/features/library/library-admin-gate';

export default function LibraryAdminLayout({ children }: { children: React.ReactNode }) {
  return <LibraryAdminGate>{children}</LibraryAdminGate>;
}
