'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigurationError } from '../../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usernameToAuthEmail } from './username-auth-email';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(supabaseConfigurationError);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const email = usernameToAuthEmail(username);
    if (!email) {
      setMessage('Tài khoản phải có từ 3 đến 32 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? 'Không thể đăng nhập. Vui lòng kiểm tra tài khoản và mật khẩu.' : null);
    if (!error) router.replace('/households');
  }

  return <main className="auth-page"><Card className="auth-card"><form onSubmit={signIn}><h1>SS Lotus</h1><p>Đăng nhập quản trị</p><Label className="auth-field">Tài khoản<Input type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></Label><Label className="auth-field">Mật khẩu<Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Label>{message && <p className="notice" role="alert">{message}</p>}<Button type="submit" disabled={!supabase}>Đăng nhập</Button></form></Card></main>;
}
