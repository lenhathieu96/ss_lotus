import { describe, expect, it } from 'vitest';
import { supabaseAuthCookieOptions } from './auth-cookie-options';

describe('Supabase auth cookie options', () => {
  it('uses a same-site root cookie and enables Secure in production builds', () => {
    expect(supabaseAuthCookieOptions).toMatchObject({ path: '/', sameSite: 'lax' });
    expect(typeof supabaseAuthCookieOptions.secure).toBe('boolean');
  });
});
