import 'server-only';

import { getServiceSupabaseClient } from './supabase-server';

type RpcRow = Record<string, unknown>;

export function requireRpcRow(data: unknown, message: string): RpcRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') throw new Error(message);
  return row as RpcRow;
}

export function rpcString(row: RpcRow, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || !value) throw new Error(`Invalid lifecycle response: ${key}`);
  return value;
}

export function rpcNumber(row: RpcRow, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw new Error(`Invalid lifecycle response: ${key}`);
  return value;
}

export async function invokeLibraryLifecycle(functionName: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await getServiceSupabaseClient().rpc(functionName, args);
  if (error) throw new Error(error.message);
  return data;
}
