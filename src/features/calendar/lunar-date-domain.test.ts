import { describe, expect, it } from 'vitest';
import { buildLunarMonthGrid, formatLunarDayMonth, formatSolarAsLunar, fromSolarDate, isValidLunarDayMonth, toSolarDate, toSolarDateString } from './lunar-date-domain';

describe('Vietnamese lunar dates', () => {
  it('formats a yearless death date without inventing a lunar year', () => {
    expect(isValidLunarDayMonth({ day: 30, month: 12, isLeap: true })).toBe(true);
    expect(isValidLunarDayMonth({ day: 31, month: 12, isLeap: false })).toBe(false);
    expect(formatLunarDayMonth({ day: 1, month: 2, isLeap: true })).toBe('01/02 ÂL (nhuận)');
  });

  it('converts the 2026 lunar new year using Vietnam time', () => {
    const date = toSolarDate({ day: 1, month: 1, year: 2026, isLeap: false });
    expect(toSolarDateString(date)).toBe('2026-02-17');
    expect(formatSolarAsLunar('2026-02-17')).toBe('01/01/2026 ÂL');
  });

  it('distinguishes the 2023 leap second month from the regular second month', () => {
    expect(fromSolarDate(new Date(2023, 2, 21))).toEqual({ day: 30, month: 2, year: 2023, isLeap: false });
    expect(fromSolarDate(new Date(2023, 2, 22))).toEqual({ day: 1, month: 2, year: 2023, isLeap: true });
    expect(toSolarDateString(toSolarDate({ day: 1, month: 2, year: 2023, isLeap: true }))).toBe('2023-03-22');
  });

  it('rejects invalid lunar dates and presents real lunar-month days in the grid', () => {
    expect(() => toSolarDate({ day: 30, month: 2, year: 2026, isLeap: false })).toThrow('không tồn tại');
    const grid = buildLunarMonthGrid(1, 2026, false);
    expect(grid.some((day) => day.lunarDate.day === 1 && day.inDisplayedMonth)).toBe(true);
    expect(grid.filter((day) => day.inDisplayedMonth).length).toBe(30);
  });
});
