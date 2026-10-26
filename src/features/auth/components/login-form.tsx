'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { BrandLogo } from '@components/brand-logo';
import { usernameToAuthEmail } from '../auth-repository';
import { authRepository } from '../auth-repository';

export function LoginForm({ returnTo = '/households' }: Readonly<{ returnTo?: string }>) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(authRepository.configurationError);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    const email = usernameToAuthEmail(username);
    if (!email) {
      setMessage('Tài khoản phải có từ 3 đến 32 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
      return;
    }
    try {
      const signedIn = await authRepository.signIn({ email, password });
      setMessage(signedIn ? null : 'Không thể đăng nhập. Vui lòng kiểm tra tài khoản và mật khẩu.');
      if (signedIn) {
        router.replace(returnTo);
        router.refresh();
      }
    } catch {
      setMessage('Không thể kết nối để đăng nhập. Vui lòng thử lại.');
    }
  }

  return <main className="auth-page"><Card className="auth-card"><form onSubmit={signIn}><div className="auth-brand"><BrandLogo size={64} /><div><h1>SS Lotus</h1><p>Đăng nhập quản trị</p></div></div><Label className="auth-field">Tài khoản<Input type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></Label><Label className="auth-field">Mật khẩu<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Label>{message && <p className="notice" role="alert">{message}</p>}<Button type="submit" disabled={!!authRepository.configurationError}>Đăng nhập</Button></form></Card></main>;
}
