'use client';

import { supabase } from '@data/network/supabase/browser-client';
import { activePagodaPreferenceKey, activePagodaPreferenceOptions } from '@lib/supabase/pagoda-preference';

const ACTIVE_PAGODA_SIGNAL_SUFFIX = '.changed';
const ACTIVE_PAGODA_CHANNEL_PREFIX = 'ss-lotus.active-pagoda';

export type PagodaAccess = Readonly<{ id: string; slug: string; name: string }>;

let currentActivePagoda: Readonly<{ userId: string; pagodaId: string }> = { userId: '', pagodaId: '' };

function preferenceCookie(userId: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(activePagodaStorageKey(userId))}=`;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  if (!cookie) return null;
  return decodeURIComponent(cookie.slice(prefix.length));
}

function writePreferenceCookie(userId: string, pagodaId: string | null): void {
  if (typeof document === 'undefined') return;
  const options = activePagodaPreferenceOptions;
  const attributes = [
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
    `Max-Age=${pagodaId ? options.maxAge : 0}`,
    options.secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
  document.cookie = `${encodeURIComponent(activePagodaStorageKey(userId))}=${pagodaId ? encodeURIComponent(pagodaId) : ''}; ${attributes}`;
}

function activePagodaSignalStorageKey(userId: string): string {
  return `${activePagodaStorageKey(userId)}${ACTIVE_PAGODA_SIGNAL_SUFFIX}`;
}

function signalActivePagodaChange(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(activePagodaSignalStorageKey(userId), String(Date.now()));
  window.localStorage.removeItem(activePagodaSignalStorageKey(userId));
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(`${ACTIVE_PAGODA_CHANNEL_PREFIX}.${userId}`);
    channel.postMessage('changed');
    channel.close();
  }
}

export function activePagodaId(): string {
  if (!currentActivePagoda.pagodaId) throw new Error('Hãy chọn chùa đang quản trị.');
  return currentActivePagoda.pagodaId;
}

/** The user-scoped cookie name, retained for consumers that previously used this helper. */
export function activePagodaStorageKey(userId: string): string {
  return activePagodaPreferenceKey(userId);
}

export function storedActivePagodaId(userId: string): string | null {
  return preferenceCookie(userId);
}

export function setActivePagodaId(userId: string, pagodaId: string): void {
  setActivePagodaMemory(userId, pagodaId);
  writePreferenceCookie(userId, pagodaId);
  signalActivePagodaChange(userId);
}

export function setActivePagodaMemory(userId: string, pagodaId: string): void {
  currentActivePagoda = { userId, pagodaId };
}

export function clearActivePagodaId(userId?: string): void {
  if (!userId || currentActivePagoda.userId === userId) currentActivePagoda = { userId: '', pagodaId: '' };
}

export function removeStoredActivePagodaId(userId: string): void {
  const hadPreference = storedActivePagodaId(userId) !== null;
  writePreferenceCookie(userId, null);
  if (hadPreference) signalActivePagodaChange(userId);
}

/** Receivers must revalidate with the server; the signal contains no tenant authority. */
export function subscribeToActivePagodaChange(userId: string, onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const channel = 'BroadcastChannel' in window
    ? new BroadcastChannel(`${ACTIVE_PAGODA_CHANNEL_PREFIX}.${userId}`)
    : null;
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea === window.localStorage && event.key === activePagodaSignalStorageKey(userId)) onChange();
  };
  const onMessage = () => onChange();
  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onMessage);
    channel?.close();
  };
}

export async function listMyPagodas(): Promise<PagodaAccess[]> {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  const { data, error } = await supabase.rpc('list_my_pagodas');
  if (error) {
    const status = (error as unknown as { status?: number }).status;
    throw Object.assign(new Error(error.message), { status: status ?? (error.code === '42501' ? 403 : undefined), code: error.code });
  }
  return (data ?? []) as PagodaAccess[];
}
