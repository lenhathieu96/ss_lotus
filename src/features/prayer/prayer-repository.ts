import { supabase } from '@data/network/supabase/browser-client';
import { activePagodaId } from '@features/pagodas/pagoda-client';
import { type CeremonyPeriod, type Household, mapHousehold, type PrayerType } from '@features/households/household-repository';

export interface PrayerRegistrationInput {
  type: PrayerType;
  personIds: string[];
  solarDate: string;
  period: CeremonyPeriod;
}
export interface WellbeingSlot {
  id: string;
  solarDate: string;
  lunarDay: number;
  period: CeremonyPeriod;
  capacity: number;
  used: number;
  remaining: number;
  isPast: boolean;
}
export interface WellbeingSeasonAvailability { lunarYear: number; slots: WellbeingSlot[]; }

export const ceremonyPeriodLabels: Record<CeremonyPeriod, string> = { morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' };
function requireSupabase() { if (!supabase) throw new Error('Thiếu cấu hình Supabase.'); return supabase; }
function requestKey(): string { return crypto.randomUUID(); }

function throwRpcError(error: { message: string; details?: string | null }): never {
  let category: string | undefined;
  try { category = JSON.parse(error.details ?? '').category; } catch { /* PostgREST may omit structured details. */ }
  const messages: Record<string, string> = {
    REVISION_CONFLICT: 'Hộ gia đình vừa được thay đổi ở nơi khác. Hãy tải lại.',
    SEASON_UNAVAILABLE: 'Chưa có mùa Cầu An phù hợp.',
    INVALID_SLOT: 'Khóa Cầu An không hợp lệ.',
    SLOT_FULL: 'Khóa Cầu An đã đủ 200 hộ.',
    AUTH_REQUIRED: 'Bạn không có quyền thao tác tại chùa này.',
  };
  if (category && messages[category]) throw new Error(messages[category]);
  if (error.message.includes('slot is full')) throw new Error('Thời khóa đã đủ số lượng đăng ký.');
  throw new Error(error.message);
}

export async function getWellbeingSeasonAvailability(): Promise<WellbeingSeasonAvailability> {
  const { data, error } = await requireSupabase().rpc('get_wellbeing_season_availability', { p_pagoda_id: activePagodaId() });
  if (error) throwRpcError(error);
  const row = data as { lunarYear: number; slots: WellbeingSlot[] };
  return { lunarYear: row.lunarYear, slots: row.slots ?? [] };
}

export async function bookHouseholdWellbeingSlot(householdId: string, expectedRevision: number, slotId: string, idempotencyKey = requestKey()): Promise<Household> {
  const { data, error } = await requireSupabase().rpc('book_household_wellbeing_slot', {
    p_pagoda_id: activePagodaId(), p_household_id: householdId, p_expected_revision: expectedRevision, p_slot_id: slotId, p_idempotency_key: idempotencyKey,
  });
  if (error) throwRpcError(error);
  return mapHousehold(data as Parameters<typeof mapHousehold>[0]);
}

/** @deprecated Old household UI used this compatibility entry point. New Cầu An always books the complete household through bookHouseholdWellbeingSlot. */
export async function createHouseholdWellbeingRegistration(householdId: string, memberIds: string[], solarDate: string, period: CeremonyPeriod): Promise<void> {
  if (!memberIds.length) throw new Error('Chọn ít nhất một thành viên.');
  const { error } = await requireSupabase().rpc('create_household_wellbeing_registration', {
    p_pagoda_id: activePagodaId(), p_household_id: householdId, p_member_ids: memberIds, p_ceremony_date: solarDate, p_period: period,
  });
  if (error) throwRpcError(error);
}

export async function createMemorialRegistration(deceasedPersonId: string, solarDate: string, period: CeremonyPeriod): Promise<void> {
  const { error } = await requireSupabase().rpc('create_memorial_registration', {
    p_pagoda_id: activePagodaId(), p_deceased_person_id: deceasedPersonId, p_ceremony_date: solarDate, p_period: period,
  });
  if (error) throwRpcError(error);
}
