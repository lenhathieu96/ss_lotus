import type { Metadata } from 'next';
import './theme.css';

export const metadata: Metadata = {
  title: 'SS Lotus',
  description: 'Quản lý hộ gia đình, hương linh và đăng ký cầu an, cầu siêu theo lịch âm.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
