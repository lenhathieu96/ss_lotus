import { describe, expect, it } from 'vitest';
import { isAuthenticationFailure, isPermissionFailure } from './auth-errors';

describe('Supabase auth error classification', () => {
  it('only treats confirmed invalid sessions as authentication failures', () => {
    expect(isAuthenticationFailure({ status: 401 })).toBe(true);
    expect(isAuthenticationFailure({ code: 'jwt_expired' })).toBe(true);
    expect(isAuthenticationFailure({ code: 'PGRST301' })).toBe(true);
    expect(isAuthenticationFailure(new Error('network offline'))).toBe(false);
  });

  it('keeps authorization denials distinct from session failures', () => {
    expect(isPermissionFailure({ status: 403 })).toBe(true);
    expect(isPermissionFailure({ code: '42501' })).toBe(true);
    expect(isPermissionFailure({ status: 500 })).toBe(false);
  });
});
