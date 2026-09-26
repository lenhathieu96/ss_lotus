'use client';

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LunarDayMonth, formatLunarDayMonth } from './lunar-date-domain';

const days = Array.from({ length: 30 }, (_, index) => index + 1);
const months = Array.from({ length: 12 }, (_, index) => index + 1);

export function LunarDayMonthPicker({ id, label, value, onChange, required = false }: { id?: string; label: string; value: LunarDayMonth; onChange: (value: LunarDayMonth) => void; required?: boolean }) {
  const generatedId = useId();
  const fieldId = id ?? `${generatedId}-death-date`;
  const update = (change: Partial<LunarDayMonth>) => onChange({ ...value, ...change });

  return <fieldset className="lunar-day-month-field" aria-describedby={`${fieldId}-help`}>
    <legend>{label}{required ? ' *' : ''}</legend>
    <p id={`${fieldId}-help`}>Chỉ lưu ngày và tháng âm lịch; chọn tháng nhuận khi cần.</p>
    <div className="lunar-day-month-controls">
      <div className="form-field"><Label htmlFor={`${fieldId}-day`}>Ngày</Label><Select value={value.day ? String(value.day) : undefined} onValueChange={(day) => update({ day: Number(day) })}><SelectTrigger id={`${fieldId}-day`} aria-label="Ngày"><SelectValue placeholder="Chọn ngày" /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day} value={String(day)}>{String(day).padStart(2, '0')}</SelectItem>)}</SelectContent></Select></div>
      <div className="form-field"><Label htmlFor={`${fieldId}-month`}>Tháng</Label><Select value={value.month ? String(value.month) : undefined} onValueChange={(month) => update({ month: Number(month) })}><SelectTrigger id={`${fieldId}-month`} aria-label="Tháng"><SelectValue placeholder="Chọn tháng" /></SelectTrigger><SelectContent>{months.map((month) => <SelectItem key={month} value={String(month)}>{String(month).padStart(2, '0')}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <Label className="lunar-leap-month"><Checkbox checked={value.isLeap} onCheckedChange={(isLeap) => update({ isLeap: isLeap === true })} /><span>Tháng nhuận</span></Label>
    <output className="lunar-day-month-value" aria-live="polite">{value.day && value.month ? formatLunarDayMonth(value) : 'Chưa chọn ngày mất'}</output>
  </fieldset>;
}
