import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClaims, setAll } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  setAll: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    setAll.mockImplementation((cookies, headers = {}) => options.cookies.setAll?.(cookies, headers));
    return { auth: { getClaims } };
  }),
}));

import { updateProxySession } from './proxy-session';

describe('proxy session', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    getClaims.mockReset();
    setAll.mockReset();
  });

  it('redirects unauthenticated protected requests and preserves refreshed cookie chunks', async () => {
    getClaims.mockImplementation(async () => {
      setAll([
        { name: 'sb-session.0', value: 'first', options: { path: '/' } },
        { name: 'sb-session.1', value: 'second', options: { path: '/' } },
      ], { pragma: 'no-cache' });
      return { data: { claims: null }, error: null };
    });

    const response = await updateProxySession(new NextRequest('https://app.example/households/123?tab=people'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example/login?returnTo=%2Fhouseholds%2F123%3Ftab%3Dpeople');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toContain('Cookie');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.cookies.getAll().map((cookie) => cookie.name)).toEqual(['sb-session.0', 'sb-session.1']);
  });

  it('does not turn an unavailable provider into a logout redirect', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: new Error('network offline') });

    const response = await updateProxySession(new NextRequest('https://app.example/overview'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('returns an authenticated login request to a safe local path', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null });

    const response = await updateProxySession(new NextRequest('https://app.example/login?returnTo=https%3A%2F%2Fattacker.example'));

    expect(response.headers.get('location')).toBe('https://app.example/households');
  });
});
