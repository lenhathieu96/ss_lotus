import type { Metadata } from 'next';
import '@features/application/theme.css';

export const metadata: Metadata = {
  title: 'SS Lotus',
  description: 'Quản lý hộ gia đình, hương linh và đăng ký cầu an, cầu siêu theo lịch âm.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/brand/lotus-favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
};

export { default } from '@features/application/application-layout';
