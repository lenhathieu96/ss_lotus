'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Users } from 'lucide-react';
import type { Family, Member } from '../household-repository';
import { Button } from '@components/ui/button';

interface FamilyCardProps {
  family: Family;
  selectedIds?: string[];
  headMemberId?: string;
  disabled?: boolean;
  onSelectMember?: (memberId: string) => void;
  onSelectAll?: () => void;
}

function SortableMember({ member, selected, head, disabled, onSelect }: {
  member: Member; selected: boolean; head: boolean; disabled: boolean; onSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: member.id, disabled });
  return <li ref={setNodeRef} className={`member-row${selected ? ' is-selected' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <Button className="drag-handle" variant="ghost" size="icon-sm" type="button" disabled={disabled} aria-label={`Di chuyển ${member.fullName}`} {...attributes} {...listeners}><GripVertical aria-hidden="true" /></Button>
    {onSelect && <input type="checkbox" className="member-select" checked={selected} disabled={disabled} onChange={onSelect} aria-label={`Chọn ${member.fullName}`} />}
    <div className="member-info"><strong>{member.fullName}{head && <span className="member-head-badge">Chủ hộ</span>}</strong><div className="member-details"><span>Pháp danh: {member.dharmaName || 'Chưa có'}</span><span>Năm sinh: {member.yearOfBirth ?? 'Chưa có'}</span></div></div>
  </li>;
}

export function FamilyCard({ family, selectedIds = [], headMemberId, disabled = false, onSelectMember, onSelectAll }: FamilyCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `family-target:${family.id}`, disabled });
  const count = family.members.filter((member) => selectedIds.includes(member.id)).length;
  return <article ref={setNodeRef} className={`family-card${isOver ? ' is-drop-target' : ''}${!family.members.length ? ' is-empty' : ''}`} aria-labelledby={`family-title-${family.id}`}>
    <header><div className="family-card-heading"><div><p>GIA ĐÌNH {family.businessNumber ? `#${family.businessNumber}` : 'MỚI · CHƯA CẤP MÃ'}</p><h3 id={`family-title-${family.id}`}>{family.address}</h3></div><span className="family-count">{family.members.length}</span></div>{onSelectAll && <label className="family-select-all"><input type="checkbox" checked={family.members.length > 0 && count === family.members.length} ref={(input) => { if (input) input.indeterminate = count > 0 && count < family.members.length; }} disabled={disabled || !family.members.length} onChange={onSelectAll} aria-label={`Chọn tất cả thành viên ${family.address}`} /> Chọn tất cả</label>}</header>
    <ul className="member-list" aria-label={`Thành viên ${family.address}`}>{family.members.map((member) => <SortableMember key={member.id} member={member} selected={selectedIds.includes(member.id)} head={headMemberId === member.id} disabled={disabled} onSelect={onSelectMember ? () => onSelectMember(member.id) : undefined} />)}</ul>
    <div className="family-dropzone"><Users aria-hidden="true" /><span>{family.members.length ? 'Thả thành viên vào gia đình này' : 'Gia đình đang trống. Kéo người vào hoặc dùng Chuyển đến.'}</span></div>
  </article>;
}
