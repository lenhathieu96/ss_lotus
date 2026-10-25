'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

export function AuthAccessError() {
  const router = useRouter();
  return <main className="auth-page"><Card className="auth-card"><h1>Không thể kiểm tra quyền truy cập</h1><p role="alert">Kết nối đang tạm thời không khả dụng. Vui lòng thử lại.</p><Button type="button" onClick={() => router.refresh()}>Thử lại</Button></Card></main>;
}

export function EmptyPagodaAccess() {
  return <main className="auth-page"><Card className="auth-card"><h1>Chưa có quyền truy cập</h1><p role="status">Tài khoản này chưa được cấp quyền vào chùa nào.</p></Card></main>;
}
