'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigurationError } from '../../lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(supabaseConfigurationError);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? 'Không thể đăng nhập. Vui lòng kiểm tra email và mật khẩu.' : null);
    if (!error) router.replace('/households');
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={signIn}><h1>SS Lotus</h1><p>Đăng nhập quản trị</p><label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{message && <p className="notice" role="alert">{message}</p>}<button type="submit" disabled={!supabase}>Đăng nhập</button></form></main>;
}
