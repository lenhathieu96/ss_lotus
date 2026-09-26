'use client';

import { useId, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { buildLunarMonthGrid, compareDates, formatLunarDate, fromSolarDate, getVietnamToday, LunarDate, parseSolarDate, shiftLunarMonth, toSolarDateString } from './lunar-date-domain';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function LunarDatePicker({ id, label, value, onChange, minDate, required = false }: { id?: string; label: string; value: string; onChange: (solarDate: string) => void; minDate?: Date; required?: boolean }) {
  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const labelId = `${triggerId}-label`;
  const initialMonth = value ? fromSolarDate(parseSolarDate(value)) : fromSolarDate(getVietnamToday());
  const [open, setOpen] = useState(false);
  const [shownMonth, setShownMonth] = useState<LunarDate>(initialMonth);
  const selected = value ? parseSolarDate(value) : null;
  const minimum = minDate ?? new Date(1800, 0, 1);
  const cells = buildLunarMonthGrid(shownMonth.month, shownMonth.year, shownMonth.isLeap);
  const monthsLabel = `${shownMonth.month} / ${shownMonth.year}${shownMonth.isLeap ? ' · tháng nhuận' : ''}`;

  function selectDate(date: Date) {
    if (compareDates(date, minimum) < 0) return;
    onChange(toSolarDateString(date));
    setShownMonth(fromSolarDate(date));
    setOpen(false);
  }

  return <div className="lunar-date-field">
    <Label className="lunar-date-label" id={labelId} htmlFor={triggerId}>{label}{required ? ' *' : ''}</Label>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={triggerId} type="button" variant="outline" className="lunar-date-trigger" aria-haspopup="dialog" aria-label={`${label}${required ? ', bắt buộc' : ''}: ${value ? formatLunarDate(fromSolarDate(parseSolarDate(value))) : 'chưa chọn'}`} aria-required={required}>
          {value ? formatLunarDate(fromSolarDate(parseSolarDate(value))) : 'Chọn ngày âm lịch'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="lunar-calendar-popover" align="start" aria-label="Chọn ngày âm lịch">
        <header><Button type="button" variant="secondary" size="icon-sm" className="calendar-nav" aria-label="Tháng trước" onClick={() => setShownMonth(shiftLunarMonth(shownMonth, -1))}><ChevronLeft aria-hidden="true" /></Button><strong>{monthsLabel}</strong><Button type="button" variant="secondary" size="icon-sm" className="calendar-nav" aria-label="Tháng sau" onClick={() => setShownMonth(shiftLunarMonth(shownMonth, 1))}><ChevronRight aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon-sm" className="calendar-close" aria-label="Đóng lịch" onClick={() => setOpen(false)}><X aria-hidden="true" /></Button></header>
        <div className="lunar-calendar-grid" role="grid" aria-label={monthsLabel}>
          {weekdays.map((day) => <span className="lunar-weekday" key={day} role="columnheader">{day}</span>)}
          {cells.map(({ solarDate, lunarDate, inDisplayedMonth }) => {
            const disabled = compareDates(solarDate, minimum) < 0;
            const isSelected = selected ? compareDates(solarDate, selected) === 0 : false;
            return <Button key={toSolarDateString(solarDate)} type="button" role="gridcell" variant="ghost" size="icon-sm" className={`lunar-day${inDisplayedMonth ? '' : ' outside'}${isSelected ? ' selected' : ''}`} aria-label={formatLunarDate(lunarDate)} aria-pressed={isSelected} disabled={disabled} onClick={() => selectDate(solarDate)}><span>{lunarDate.day}</span>{lunarDate.day === 1 && <small>{lunarDate.month}{lunarDate.isLeap ? '*' : ''}</small>}</Button>;
          })}
        </div>
        <p className="lunar-calendar-note">Số nhỏ trong ô thể hiện ngày âm lịch; tháng nhuận có dấu *.</p>
      </PopoverContent>
    </Popover>
  </div>;
}
