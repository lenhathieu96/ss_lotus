import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Family, Member } from './household-domain';
import { Button } from '@/components/ui/button';

interface FamilyCardProps {
  family: Family;
  onRemoveMember: (memberId: string) => void;
}

interface SortableMemberProps {
  member: Member;
  onRemove: () => void;
}

function SortableMember({ member, onRemove }: SortableMemberProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: member.id });
  return <li ref={setNodeRef} className="member-row" style={{ transform: CSS.Transform.toString(transform), transition }}>
    <Button className="drag-handle" variant="ghost" size="icon-sm" type="button" aria-label={`Di chuyển ${member.fullName}`} {...attributes} {...listeners}><GripVertical aria-hidden="true" /></Button>
    <span><strong>{member.fullName}</strong>{member.dharmaName && <small>Pháp danh: {member.dharmaName}</small>}</span>
    <Button className="icon-button danger" variant="ghost" size="icon-sm" type="button" aria-label={`Xóa ${member.fullName}`} onClick={onRemove}><Trash2 aria-hidden="true" /></Button>
  </li>;
}

export function FamilyCard({ family, onRemoveMember }: FamilyCardProps) {
  return <article className="family-card">
    <header><div><p>GIA ĐÌNH {family.businessNumber ? `#${family.businessNumber}` : ''}</p><h3>{family.address}</h3></div><span>{family.members.length} thành viên</span></header>
    {family.members.length === 0 ? <p className="empty-members">Thêm ít nhất một thành viên để có thể lưu.</p> : <ul className="member-list">
      {family.members.map((member) => <SortableMember key={member.id} member={member} onRemove={() => onRemoveMember(member.id)} />)}
    </ul>}
  </article>;
}
