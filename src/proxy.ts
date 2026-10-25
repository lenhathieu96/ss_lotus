import type { NextRequest } from 'next/server';
import { updateProxySession } from '@lib/supabase/proxy-session';

export async function proxy(request: NextRequest) {
  return updateProxySession(request);
}

export const config = {
  matcher: [
    '/login',
    '/households/:path*',
    '/huong-linh/:path*',
    '/overview',
    '/settings',
    '/admin/:path*',
    '/prayer-for-wellbeing',
    '/memorial-prayer/:path*',
  ],
};
