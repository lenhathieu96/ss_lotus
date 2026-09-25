import type { Metadata } from 'next';
import './theme.css';

export const metadata: Metadata = {
  title: 'SS Lotus',
  description: 'Quản trị hộ gia đình và lễ cầu an, cầu siêu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
