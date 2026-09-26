import { describe, expect, it } from 'vitest';
import { usernameToAuthEmail } from './username-auth-email';

describe('usernameToAuthEmail', () => {
  it('normalizes a username into the internal Supabase Auth email alias', () => {
    expect(usernameToAuthEmail(' Admin ')).toBe('admin@ss-lotus.local');
  });

  it('rejects a username that cannot safely become an email alias', () => {
    expect(usernameToAuthEmail('a@b')).toBeNull();
    expect(usernameToAuthEmail('ab')).toBeNull();
  });
});
