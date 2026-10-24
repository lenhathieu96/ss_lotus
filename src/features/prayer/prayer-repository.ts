import { type CeremonyPeriod, type PrayerType } from '@features/households/household-repository';
import { supabase } from '@data/network/supabase/browser-client';
import { activePagodaId } from '@features/pagodas/pagoda-client';

export interface PrayerRegistrationInput {
  type: PrayerType;
  personIds: string[];
  solarDate: string;
  period: CeremonyPeriod;
}

export const ceremonyPeriodLabels: Record<CeremonyPeriod, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
};

function requireSupabase() {
  if (!supabase) throw new Error('Thiếu cấu hình Supabase.');
  return supabase;
}

function throwRpcError(message: string): never {
  if (message.includes('Administrator access required')) throw new Error('Tài khoản hiện tại chưa được cấp quyền quản trị.');
  if (message.includes('Ceremony date must be today or in the future')) throw new Error('Ngày đăng ký phải từ hôm nay trở đi.');
  if (message.includes('slot is full')) throw new Error('Thời khóa đã đủ số lượng đăng ký.');
  throw new Error(message);
}

export async function createHouseholdWellbeingRegistration(
  householdId: string,
  memberIds: string[],
  solarDate: string,
  period: CeremonyPeriod,
): Promise<void> {
  if (!memberIds.length) throw new Error('Chọn ít nhất một thành viên.');
  const { error } = await requireSupabase().rpc('create_household_wellbeing_registration', {
    p_pagoda_id: activePagodaId(),
    p_household_id: householdId,
    p_member_ids: memberIds,
    p_ceremony_date: solarDate,
    p_period: period,
  });
  if (error) throwRpcError(error.message);
}

export async function createMemorialRegistration(
  deceasedPersonId: string,
  solarDate: string,
  period: CeremonyPeriod,
): Promise<void> {
  const { error } = await requireSupabase().rpc('create_memorial_registration', {
    p_pagoda_id: activePagodaId(),
    p_deceased_person_id: deceasedPersonId,
    p_ceremony_date: solarDate,
    p_period: period,
  });
  if (error) throwRpcError(error.message);
}
