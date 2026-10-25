import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@lib/supabase/server-client';
import { isAuthenticationFailure } from '@lib/supabase/auth-errors';
import { safeReturnPath } from '@lib/supabase/safe-return-path';
import { LoginForm } from '../components/login-form';
import { AuthAccessError } from '../components/auth-access-error';

type LoginPageProps = Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const rawReturnTo = typeof params.returnTo === 'string' ? params.returnTo : undefined;
  const returnTo = safeReturnPath(rawReturnTo);
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (typeof data?.claims?.sub === 'string') redirect(returnTo);
  if (error && !isAuthenticationFailure(error)) return <AuthAccessError />;
  return <LoginForm returnTo={returnTo} />;
}
