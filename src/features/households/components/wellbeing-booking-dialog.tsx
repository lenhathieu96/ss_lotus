'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { ceremonyPeriodLabels, getWellbeingSeasonAvailability, type WellbeingSlot } from '@features/prayer/prayer-repository';
import type { WellbeingBookingSummary } from '../household-repository';

interface WellbeingBookingDialogProps {
  booking: WellbeingBookingSummary | null | undefined;
  onClose: () => void;
  onSubmit: (slotId: string) => Promise<void>;
}

export function WellbeingBookingDialog({ booking, onClose, onSubmit }: WellbeingBookingDialogProps) {
  const [slots, setSlots] = useState<WellbeingSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState(booking?.slotId ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const groupedSlots = useMemo(() => {
    const groups = new Map<number, WellbeingSlot[]>();
    for (const slot of slots) groups.set(slot.lunarDay, [...(groups.get(slot.lunarDay) ?? []), slot]);
    return [...groups.entries()];
  }, [slots]);

  useEffect(() => {
    let active = true;
    void getWellbeingSeasonAvailability().then((availability) => {
      if (!active) return;
      setSlots(availability.slots);
      setSelectedSlotId((current) => current || availability.slots.find((slot) => !slot.isPast && slot.remaining > 0)?.id || '');
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải lịch Cầu An.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function confirm() {
    if (!selectedSlotId || saving) return;
    setSaving(true); setError('');
    try { await onSubmit(selectedSlotId); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đặt lịch Cầu An.'); }
    finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}><DialogContent className="wellbeing-dialog" showCloseButton={!saving}>
    <DialogHeader><DialogTitle>{booking ? 'Đổi lịch Cầu An' : 'Đặt lịch Cầu An'}</DialogTitle><p>{booking ? `Lịch hiện tại: ${ceremonyPeriodLabels[booking.period]} · ${booking.solarDate}` : 'Mỗi hộ được đặt một lịch trong mùa gần nhất.'}</p></DialogHeader>
    <section className="wellbeing-dialog-body" aria-busy={loading}>
      {loading && <p role="status">Đang tải 15 ngày Cầu An…</p>}
      {!loading && <><h3>1. Chọn ngày âm lịch</h3><p>Từ mùng 1 đến 15 tháng Giêng</p><div className="wellbeing-days" aria-label="Ngày tháng Giêng">{groupedSlots.map(([day, daySlots]) => {
        const currentDay = selectedDay ?? slots.find((slot) => slot.id === selectedSlotId)?.lunarDay;
        return <Button key={day} type="button" className="wellbeing-day-option" variant={currentDay === day ? 'default' : 'outline'} aria-pressed={currentDay === day} disabled={saving || daySlots.every((slot) => slot.isPast && slot.id !== booking?.slotId)} onClick={() => { setSelectedDay(day); setSelectedSlotId(''); }}><strong>{String(day).padStart(2, '0')}</strong><span>Tháng 1 ÂL</span></Button>;
      })}</div><h3>2. Chọn khóa</h3><p>Mỗi khóa nhận tối đa 200 hộ.</p></>}
      {!loading && groupedSlots.filter(([day]) => day === (selectedDay ?? slots.find((slot) => slot.id === selectedSlotId)?.lunarDay)).map(([day, daySlots]) => <section className="wellbeing-day" key={day}><div className="wellbeing-slot-grid">{daySlots.map((slot) => {
        const isCurrent = slot.id === booking?.slotId;
        const disabled = !isCurrent && (slot.isPast || slot.remaining === 0);
        return <Button key={slot.id} type="button" variant={slot.id === selectedSlotId ? 'default' : 'secondary'} className="wellbeing-slot" disabled={disabled || saving} aria-pressed={slot.id === selectedSlotId} onClick={() => setSelectedSlotId(slot.id)}>
          <strong>{ceremonyPeriodLabels[slot.period]}</strong><span>{slot.remaining}/{slot.capacity} chỗ</span>{isCurrent && <small>Lịch hiện tại</small>}
        </Button>;
      })}</div></section>)}
      {error && <p role="alert" className="notice">{error}</p>}
    </section>
    <DialogFooter><Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Quay lại hồ sơ</Button><Button type="button" disabled={!selectedSlotId || loading || saving} onClick={() => void confirm()}>{saving ? 'Đang xác nhận…' : booking ? 'Xác nhận đổi lịch' : 'Xác nhận đặt lịch'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
