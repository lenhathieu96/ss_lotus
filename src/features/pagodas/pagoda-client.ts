'use client';

import { supabase } from '@data/network/supabase/browser-client';

const ACTIVE_PAGODA_STORAGE_PREFIX = 'ss-lotus.active-pagoda-id';

export type PagodaAccess = Readonly<{ id: string; slug: string; name: string }>;

let currentActivePagoda: Readonly<{ userId: string; pagodaId: string }> = { userId: '', pagodaId: '' };

export function activePagodaId(): string {
  if (!currentActivePagoda.pagodaId) throw new Error('Hãy chọn chùa đang quản trị.');
  return currentActivePagoda.pagodaId;
}

export function activePagodaStorageKey(userId: string): string {
  return `${ACTIVE_PAGODA_STORAGE_PREFIX}.${userId}`;
}

export function storedActivePagodaId(userId: string): string | null {
  return window.localStorage.getItem(activePagodaStorageKey(userId));
}

export function setActivePagodaId(userId: string, pagodaId: string): void {
  currentActivePagoda = { userId, pagodaId };
  window.localStorage.setItem(activePagodaStorageKey(userId), pagodaId);
}

export function setActivePagodaMemory(userId: string, pagodaId: string): void {
  currentActivePagoda = { userId, pagodaId };
}

export function clearActivePagodaId(userId?: string): void {
  if (!userId || currentActivePagoda.userId === userId) currentActivePagoda = { userId: '', pagodaId: '' };
}

export function removeStoredActivePagodaId(userId: string): void {
  window.localStorage.removeItem(activePagodaStorageKey(userId));
}

export async function listMyPagodas(): Promise<PagodaAccess[]> {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  const { data, error } = await supabase.rpc('list_my_pagodas');
  if (error) throw new Error(error.message);
  return (data ?? []) as PagodaAccess[];
}
