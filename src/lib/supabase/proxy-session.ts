import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { safeReturnPath } from './safe-return-path';
import { supabaseAuthCookieOptions } from './auth-cookie-options';

const protectedPaths = new Set([
  '/overview',
  '/settings',
  '/prayer-for-wellbeing',
]);

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.has(pathname)
    || pathname === '/households' || pathname.startsWith('/households/')
    || pathname === '/huong-linh' || pathname.startsWith('/huong-linh/')
    || pathname === '/admin' || pathname.startsWith('/admin/')
    || pathname === '/memorial-prayer' || pathname.startsWith('/memorial-prayer/');
}

function isAuthenticationFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; status?: unknown };
  return candidate.status === 401 || (typeof candidate.code === 'string' && [
    'bad_jwt',
    'invalid_jwt',
    'jwt_expired',
    'refresh_token_not_found',
    'session_not_found',
  ].includes(candidate.code));
}

function mergeVaryCookie(response: NextResponse): void {
  const vary = response.headers.get('Vary');
  if (!vary) {
    response.headers.set('Vary', 'Cookie');
    return;
  }
  if (vary.trim() === '*' || vary.split(',').some((value) => value.trim().toLowerCase() === 'cookie')) return;
  response.headers.set('Vary', `${vary}, Cookie`);
}

function secureResponse(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  mergeVaryCookie(response);
  return response;
}

function copySessionResponse(source: NextResponse, destination: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) destination.cookies.set(cookie);
  for (const header of ['expires', 'pragma', 'vary']) {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  }
  return secureResponse(destination);
}

function configuredSupabase(): [string, string] | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? [url, publishableKey] : null;
}

/**
 * Refreshes the cookie session before rendering and owns all response cookie
 * writes. Provider outages keep the current response/session intact.
 */
export async function updateProxySession(request: NextRequest): Promise<NextResponse> {
  const requestHeaders = new Headers(request.headers);
  const nextResponse = () => NextResponse.next({ request: { headers: requestHeaders } });
  let response = nextResponse();
  const configuration = configuredSupabase();

  if (!configuration) return secureResponse(response);

  const [url, publishableKey] = configuration;
  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: supabaseAuthCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        requestHeaders.set('cookie', request.cookies.toString());
        response = nextResponse();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  let claims: unknown = null;
  let verificationUnavailable = false;
  try {
    const result = await supabase.auth.getClaims();
    claims = result.data?.claims ?? null;
    verificationUnavailable = Boolean(result.error) && !isAuthenticationFailure(result.error);
  } catch {
    verificationUnavailable = true;
  }

  if (request.nextUrl.pathname === '/login' && claims) {
    const target = safeReturnPath(request.nextUrl.searchParams.get('returnTo'));
    return copySessionResponse(response, NextResponse.redirect(new URL(target, request.url)));
  }

  if (isProtectedPath(request.nextUrl.pathname) && !claims && !verificationUnavailable) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return copySessionResponse(response, NextResponse.redirect(loginUrl));
  }

  return secureResponse(response);
}
