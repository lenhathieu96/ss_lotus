import 'server-only';

import { NextRequest } from 'next/server';
import { getServiceSupabaseClient, getSupabaseAuthClient } from './supabase-server';

export class LibraryRouteError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export type LibraryAdminIdentity = Readonly<{ userId: string }>;

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requireUuid(value: string, message = 'Invalid document ID.', status = 400): string {
  if (!isUuid(value)) throw new LibraryRouteError(message, status);
  return value;
}

export async function requireLibraryAdmin(request: NextRequest): Promise<LibraryAdminIdentity> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new LibraryRouteError('Authentication is required.', 401);

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
  if (error || !data.user) throw new LibraryRouteError('Authentication is required.', 401);

  const { data: admin, error: adminError } = await getServiceSupabaseClient()
    .from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (adminError) throw new Error(adminError.message);
  if (!admin) throw new LibraryRouteError('Administrator access required.', 403);
  return { userId: data.user.id };
}

export function routeErrorResponse(error: unknown): Response {
  if (error instanceof LibraryRouteError) return Response.json({ error: error.message }, { status: error.status });
  console.error('Library route failed', error);
  return Response.json({ error: 'The library request could not be completed.' }, { status: 500 });
}

export function requireObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LibraryRouteError('Invalid request body.', 400);
  return input as Record<string, unknown>;
}

export function requiredString(input: Record<string, unknown>, key: string, maxLength = 500): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) throw new LibraryRouteError(`Invalid ${key}.`, 400);
  return value.trim();
}
