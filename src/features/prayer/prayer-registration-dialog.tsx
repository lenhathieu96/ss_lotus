'use client';

import { FormEvent, useState } from 'react';
import { CeremonyPeriod } from '../households/household-domain';
import { LunarDatePicker } from '../calendar/lunar-date-picker';
import { toSolarDateString, getVietnamToday } from '../calendar/lunar-date-domain';
import { ceremonyPeriodLabels } from './prayer-domain';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function PrayerRegistrationDialog({ title, onClose, onSubmit }: { title: string; onClose: () => void; onSubmit: (solarDate: string, period: CeremonyPeriod) => Promise<void> }) {
  const [date, setDate] = useState(toSolarDateString(getVietnamToday()));
  const [period, setPeriod] = useState<CeremonyPeriod>('morning');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setSaving(true);
    try { await onSubmit(date, period); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu đăng ký.'); }
    finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}><DialogContent className="prayer-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><form onSubmit={(event) => void submit(event)}>
    <LunarDatePicker label="Ngày lễ (âm lịch)" value={date} minDate={getVietnamToday()} onChange={setDate} required />
    <fieldset className="period-options"><legend>Thời khóa</legend><RadioGroup value={period} onValueChange={(value) => setPeriod(value as CeremonyPeriod)}>{(Object.entries(ceremonyPeriodLabels) as Array<[CeremonyPeriod, string]>).map(([key, label]) => <Label className="prayer-period-choice" key={key} htmlFor={`prayer-period-${key}`}><RadioGroupItem id={`prayer-period-${key}`} value={key} />{label}</Label>)}</RadioGroup></fieldset>
    {error && <p role="alert" className="notice">{error}</p>}
    <DialogFooter><Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Xác nhận đăng ký'}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
