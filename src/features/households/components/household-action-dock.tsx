'use client';

import { CalendarPlus, RotateCcw, Save, Plus, ArrowRight, Split, Merge, Archive } from 'lucide-react';
import { Button } from '@components/ui/button';
import type { FamilyOperation } from './family-operation-dialog';

interface HouseholdActionDockProps {
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  canBook: boolean;
  hasBooking: boolean;
  selectedCount: number;
  familyCount: number;
  canSplit: boolean;
  onOperation: (operation: FamilyOperation) => void;
  onClearSelection: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onBook: () => void;
}

/** The sole persistent action surface for a household workspace. */
export function HouseholdActionDock({ dirty, saving, canSave, canBook, hasBooking, onSave, onDiscard, onBook, selectedCount, familyCount, canSplit, onOperation, onClearSelection }: HouseholdActionDockProps) {
  return <footer className="household-action-dock" aria-label="Thao tác hộ gia đình" aria-busy={saving}>
    <div className="household-action-dock-status" aria-live="polite">
      <strong>{selectedCount > 0 ? `Đã chọn ${selectedCount} thành viên` : saving ? 'Đang lưu thay đổi…' : dirty ? 'Có thay đổi trong bản nháp' : 'Hồ sơ đã được lưu'}</strong>
      <span>{dirty ? 'Lưu hoàn tất trước khi đặt lịch Cầu An.' : hasBooking ? 'Có thể đổi lịch Cầu An.' : 'Có thể đặt lịch Cầu An.'}</span>
    </div>
    <div className="household-action-dock-actions">
      <div className="household-dock-edit-actions">
        <Button type="button" variant="secondary" disabled={saving || !selectedCount} onClick={() => onOperation('move')}><ArrowRight aria-hidden="true" /> Chuyển</Button>
        <Button type="button" variant="secondary" disabled={saving || !canSplit} title="Chọn đúng một thành viên trong gia đình có ít nhất hai người" onClick={() => onOperation('split')}><Split aria-hidden="true" /> Tách</Button>
        <Button type="button" variant="secondary" disabled={saving || familyCount < 2} onClick={() => onOperation('merge')}><Merge aria-hidden="true" /> Gộp</Button>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => onOperation('add-family')}><Plus aria-hidden="true" /> Thêm gia đình</Button>
        <Button type="button" variant="secondary" disabled={saving || !familyCount} onClick={() => onOperation('add-member')}><Plus aria-hidden="true" /> Thêm thành viên</Button>
        <Button type="button" variant="ghost" disabled={saving || !selectedCount} onClick={() => onOperation('archive')}><Archive aria-hidden="true" /> Lưu trữ</Button>
        {selectedCount > 0 && <Button type="button" variant="ghost" disabled={saving} onClick={onClearSelection}>Bỏ chọn</Button>}
      </div>
      <div className="household-dock-commit-actions">
      <Button type="button" variant="ghost" disabled={saving || !dirty} onClick={onDiscard}><RotateCcw aria-hidden="true" /> Hoàn tác</Button>
      <Button type="button" variant="secondary" disabled={!canBook || saving} onClick={onBook}><CalendarPlus aria-hidden="true" /> {hasBooking ? 'Đổi lịch Cầu An' : 'Đặt lịch Cầu An'}</Button>
      <Button type="button" disabled={!dirty || !canSave || saving} onClick={onSave}><Save aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button>
      </div>
    </div>
  </footer>;
}
