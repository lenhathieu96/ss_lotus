/** Keep browser, proxy and RSC clients on one explicit cookie policy. */
export const supabaseAuthCookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
};
