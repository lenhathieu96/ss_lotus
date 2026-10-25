'use client';

import { CalendarPlus, RotateCcw, Save, X } from 'lucide-react';
import { Button } from '@components/ui/button';

interface HouseholdActionDockProps {
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  canBook: boolean;
  hasBooking: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onBook: () => void;
}

/** The sole persistent action surface for a household workspace. */
export function HouseholdActionDock({ dirty, saving, canSave, canBook, hasBooking, onSave, onDiscard, onBook }: HouseholdActionDockProps) {
  return <footer className="household-action-dock" aria-label="Thao tác hộ gia đình">
    <div className="household-action-dock-status" aria-live="polite">
      <strong>{saving ? 'Đang lưu thay đổi…' : dirty ? 'Có thay đổi trong bản nháp' : 'Hồ sơ đã được lưu'}</strong>
      <span>{dirty ? 'Lưu hoàn tất trước khi đặt lịch Cầu An.' : hasBooking ? 'Có thể đổi lịch Cầu An.' : 'Có thể đặt lịch Cầu An.'}</span>
    </div>
    <div className="household-action-dock-actions">
      {dirty && <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}><RotateCcw aria-hidden="true" /> Hoàn tác</Button>}
      <Button type="button" variant="secondary" disabled={!canBook || saving} onClick={onBook}><CalendarPlus aria-hidden="true" /> {hasBooking ? 'Đổi lịch Cầu An' : 'Đặt lịch Cầu An'}</Button>
      {dirty && <Button type="button" disabled={!canSave || saving} onClick={onSave}><Save aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>}
      {!dirty && <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard}><X aria-hidden="true" /> Quay lại</Button>}
    </div>
  </footer>;
}
