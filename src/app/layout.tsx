import type { Metadata } from 'next';
import '@features/application/theme.css';

export const metadata: Metadata = {
  title: 'SS Lotus',
  description: 'Quản lý hộ gia đình, hương linh và đăng ký cầu an, cầu siêu theo lịch âm.',
};

export { default } from '@features/application/application-layout';
