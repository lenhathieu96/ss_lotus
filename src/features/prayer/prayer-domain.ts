import { CeremonyPeriod, PrayerType } from '../households/household-domain';

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
