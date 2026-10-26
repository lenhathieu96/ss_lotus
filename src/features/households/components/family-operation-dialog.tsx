'use client';

import { useState } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@components/ui/dialog';
import type { Family } from '../household-repository';

export type FamilyOperation = 'add-family' | 'add-member' | 'move' | 'split' | 'merge' | 'archive';
export interface FamilyOperationValues { address: string; name: string; dharmaName: string; yearOfBirth?: number; sourceId: string; targetId: string }
const titles: Record<FamilyOperation, string> = { 'add-family': 'Thêm gia đình', 'add-member': 'Thêm thành viên', move: 'Chuyển thành viên', split: 'Tách gia đình', merge: 'Gộp gia đình', archive: 'Lưu trữ thành viên' };

/** Collect only the fields needed by the operation chosen in the floating dock. */
export function FamilyOperationDialog({ operation, families, selectedIds, saving, onClose, onSubmit }: {
  operation: FamilyOperation; families: Family[]; selectedIds: string[]; saving: boolean;
  onClose: () => void; onSubmit: (values: FamilyOperationValues) => void;
}) {
  const selectedSource = families.find((family) => family.members.some((member) => selectedIds.includes(member.id)));
  const [sourceId, setSourceId] = useState(selectedSource?.id ?? families[0]?.id ?? '');
  const [targetId, setTargetId] = useState(operation === 'add-member' ? selectedSource?.id ?? families[0]?.id ?? '' : '');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [dharmaName, setDharmaName] = useState('');
  const [year, setYear] = useState('');
  const targets = families.filter((family) => operation !== 'merge' || family.id !== sourceId);
  const canSubmit = operation === 'add-family' ? Boolean(address.trim())
    : operation === 'add-member' ? Boolean(targetId && name.trim())
    : operation === 'split' ? selectedIds.length === 1 && Boolean(address.trim()) && (selectedSource?.members.length ?? 0) > 1
    : operation === 'merge' ? Boolean(sourceId && targetId && sourceId !== targetId)
    : operation === 'move' ? selectedIds.length > 0 && Boolean(targetId) && families.some((family) => family.id !== targetId && family.members.some((member) => selectedIds.includes(member.id)))
    : selectedIds.length > 0;
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}><DialogContent className="family-operation-dialog" showCloseButton={!saving}>
    <DialogHeader><DialogTitle>{titles[operation]}</DialogTitle><DialogDescription>{operation === 'split' ? 'Tách đúng một thành viên sang gia đình mới. Gia đình nguồn cần còn ít nhất một người.' : operation === 'archive' ? `Lưu trữ ${selectedIds.length} thành viên đã chọn. Thay đổi chỉ có hiệu lực sau khi lưu hồ sơ.` : 'Thay đổi được giữ trong bản nháp cho đến khi lưu hồ sơ.'}</DialogDescription></DialogHeader>
    <form className="family-operation-form" onSubmit={(event) => { event.preventDefault(); if (canSubmit && !saving) onSubmit({ address, name, dharmaName, yearOfBirth: year ? Number(year) : undefined, sourceId, targetId }); }}>
      <fieldset disabled={saving} className="family-operation-fields">
        {(operation === 'add-family' || operation === 'split') && <Label>Địa chỉ gia đình mới<Input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ví dụ: 12 Lê Lợi" /></Label>}
        {operation === 'add-member' && <><Label>Họ và tên<Input required value={name} onChange={(event) => setName(event.target.value)} /></Label><Label>Pháp danh<Input value={dharmaName} onChange={(event) => setDharmaName(event.target.value)} /></Label><Label>Năm sinh<Input type="number" min="1" max={new Date().getFullYear()} value={year} onChange={(event) => setYear(event.target.value)} /></Label></>}
        {operation === 'merge' && <Label>Gia đình nguồn để gộp<select value={sourceId} onChange={(event) => { setSourceId(event.target.value); setTargetId(''); }}>{families.map((family) => <option key={family.id} value={family.id}>{family.address}</option>)}</select></Label>}
        {['add-member', 'move', 'merge'].includes(operation) && <Label>{operation === 'merge' ? 'Gia đình đích để gộp' : 'Gia đình nhận thành viên'}<select required value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Chọn gia đình</option>{targets.map((family) => <option key={family.id} value={family.id}>{family.address}{!family.members.length ? ' · Đang trống' : ''}</option>)}</select></Label>}
        {['move', 'split', 'archive'].includes(operation) && <ul className="family-operation-selection">{families.flatMap((family) => family.members).filter((member) => selectedIds.includes(member.id)).map((member) => <li key={member.id}>{member.fullName}</li>)}</ul>}
      </fieldset>
      <DialogFooter><Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Hủy</Button><Button type="submit" disabled={saving || !canSubmit}>Xác nhận</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
