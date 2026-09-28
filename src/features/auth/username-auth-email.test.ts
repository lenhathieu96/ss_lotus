import { describe, expect, it } from 'vitest';
import { loginIdentifierToAuthEmail, usernameToAuthEmail } from './username-auth-email';

describe('usernameToAuthEmail', () => {
  it('normalizes a username into the internal Supabase Auth email alias', () => {
    expect(usernameToAuthEmail(' Admin ')).toBe('admin@ss-lotus.local');
  });

  it('rejects a username that cannot safely become an email alias', () => {
    expect(usernameToAuthEmail('a@b')).toBeNull();
    expect(usernameToAuthEmail('ab')).toBeNull();
  });

  it('uses a real email address directly and preserves legacy aliases', () => {
    expect(loginIdentifierToAuthEmail(' Thichminhtrach1972@gmail.com ')).toBe('thichminhtrach1972@gmail.com');
    expect(loginIdentifierToAuthEmail('Admin')).toBe('admin@ss-lotus.local');
    expect(loginIdentifierToAuthEmail('a@b')).toBeNull();
  });
});
