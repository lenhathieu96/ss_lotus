import { PublicLibraryLayout } from '@features/application/components/public-library-layout';

export default function LibraryRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PublicLibraryLayout>{children}</PublicLibraryLayout>;
}
