import { LichTa } from '@lichta/core';

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
}

export interface LunarDayMonth {
  day: number;
  month: number;
  isLeap: boolean;
}

export interface LunarCalendarDay {
  solarDate: Date;
  lunarDate: LunarDate;
  inDisplayedMonth: boolean;
}

const TIME_ZONE = 7;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function fromSolarDate(date: Date): LunarDate {
  const converted = LichTa.toLunar(date.getDate(), date.getMonth() + 1, date.getFullYear(), TIME_ZONE);
  return { day: converted.day, month: converted.month, year: converted.year, isLeap: converted.isLeap };
}

export function toSolarDate(lunar: LunarDate): Date {
  if (!Number.isInteger(lunar.year) || lunar.year < 1800 || lunar.year > 2199 || !Number.isInteger(lunar.month) || lunar.month < 1 || lunar.month > 12 || !Number.isInteger(lunar.day) || lunar.day < 1 || lunar.day > 30) {
    throw new Error('Ngày âm lịch không hợp lệ.');
  }
  const solar = LichTa.toSolar(lunar.day, lunar.month, lunar.year, lunar.isLeap, TIME_ZONE);
  const date = new Date(solar.year, solar.month - 1, solar.day);
  const roundTrip = fromSolarDate(date);
  if (roundTrip.day !== lunar.day || roundTrip.month !== lunar.month || roundTrip.year !== lunar.year || roundTrip.isLeap !== lunar.isLeap) {
    throw new Error('Ngày âm lịch không tồn tại trong tháng đã chọn.');
  }
  return date;
}

export function parseSolarDate(value: string): Date {
  if (!DATE_ONLY.test(value)) throw new Error('Ngày dương lịch lưu trữ không hợp lệ.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Ngày dương lịch lưu trữ không hợp lệ.');
  return date;
}

export function toSolarDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatLunarDate(lunar: LunarDate): string {
  return `${String(lunar.day).padStart(2, '0')}/${String(lunar.month).padStart(2, '0')}/${lunar.year} ÂL${lunar.isLeap ? ' (nhuận)' : ''}`;
}

export function isValidLunarDayMonth(value: LunarDayMonth): boolean {
  return Number.isInteger(value.day) && value.day >= 1 && value.day <= 30
    && Number.isInteger(value.month) && value.month >= 1 && value.month <= 12
    && typeof value.isLeap === 'boolean';
}

export function formatLunarDayMonth(value: LunarDayMonth): string {
  return `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')} ÂL${value.isLeap ? ' (nhuận)' : ''}`;
}

export function formatSolarAsLunar(value: string): string {
  return formatLunarDate(fromSolarDate(parseSolarDate(value)));
}

export function getVietnamToday(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(part('year'), part('month') - 1, part('day'));
}

export function compareDates(left: Date, right: Date): number {
  return Math.sign(toSolarDateString(left).localeCompare(toSolarDateString(right)));
}

export function getLunarMonthStart(month: number, year: number, isLeap: boolean): Date | null {
  try {
    return toSolarDate({ day: 1, month, year, isLeap });
  } catch {
    return null;
  }
}

export function listLunarMonths(year: number): Array<{ month: number; year: number; isLeap: boolean; start: Date }> {
  const months: Array<{ month: number; year: number; isLeap: boolean; start: Date }> = [];
  for (let month = 1; month <= 12; month += 1) {
    for (const isLeap of [false, true]) {
      const start = getLunarMonthStart(month, year, isLeap);
      if (start) months.push({ month, year, isLeap, start });
    }
  }
  return months.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function shiftLunarMonth(current: LunarDate, direction: -1 | 1) {
  const all = [...listLunarMonths(current.year - 1), ...listLunarMonths(current.year), ...listLunarMonths(current.year + 1)];
  const index = all.findIndex((month) => month.year === current.year && month.month === current.month && month.isLeap === current.isLeap);
  const next = all[index + direction];
  if (!next) return current;
  return { day: 1, month: next.month, year: next.year, isLeap: next.isLeap } satisfies LunarDate;
}

export function buildLunarMonthGrid(month: number, year: number, isLeap: boolean, weekStartsOnMonday = true): LunarCalendarDay[] {
  const start = getLunarMonthStart(month, year, isLeap);
  if (!start) throw new Error('Tháng âm lịch không tồn tại.');
  const currentMonth = { month, year, isLeap };
  const months = [...listLunarMonths(year), ...listLunarMonths(year + 1)];
  const index = months.findIndex((entry) => entry.year === year && entry.month === month && entry.isLeap === isLeap);
  const nextStart = months[index + 1]?.start;
  if (!nextStart) throw new Error('Không xác định được tháng âm lịch kế tiếp.');
  const length = Math.round((nextStart.getTime() - start.getTime()) / 86400000);
  const offset = weekStartsOnMonday ? (start.getDay() + 6) % 7 : start.getDay();
  const days: LunarCalendarDay[] = [];
  for (let indexDay = 1 - offset; indexDay <= length; indexDay += 1) {
    const solarDate = new Date(start.getFullYear(), start.getMonth(), start.getDate() + indexDay - 1);
    const lunarDate = fromSolarDate(solarDate);
    days.push({ solarDate, lunarDate, inDisplayedMonth: lunarDate.month === currentMonth.month && lunarDate.year === currentMonth.year && lunarDate.isLeap === currentMonth.isLeap });
  }
  while (days.length % 7) {
    const previous = days[days.length - 1].solarDate;
    const solarDate = new Date(previous.getFullYear(), previous.getMonth(), previous.getDate() + 1);
    days.push({ solarDate, lunarDate: fromSolarDate(solarDate), inDisplayedMonth: false });
  }
  return days;
}
