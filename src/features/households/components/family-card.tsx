import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, UserMinus } from 'lucide-react';
import { Family, Member } from '../household-repository';
import { Button } from '@components/ui/button';

interface FamilyCardProps {
  family: Family;
  onArchiveMember?: (memberId: string) => void;
}

interface SortableMemberProps {
  member: Member;
  onArchive?: () => void;
}

function SortableMember({ member, onArchive }: SortableMemberProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: member.id });
  return <li ref={setNodeRef} className="member-row" style={{ transform: CSS.Transform.toString(transform), transition }}>
    <Button className="drag-handle" variant="ghost" size="icon-sm" type="button" aria-label={`Di chuyển ${member.fullName}`} {...attributes} {...listeners}><GripVertical aria-hidden="true" /></Button>
    <span><strong>{member.fullName}</strong>{member.dharmaName && <small>Pháp danh: {member.dharmaName}</small>}</span>
    {onArchive && <Button className="icon-button danger" variant="ghost" size="icon-sm" type="button" aria-label={`Xóa ${member.fullName}`} onClick={onArchive}><UserMinus aria-hidden="true" /></Button>}
  </li>;
}

export function FamilyCard({ family, onArchiveMember }: FamilyCardProps) {
  return <article className="family-card">
    <header><div><p>GIA ĐÌNH {family.businessNumber ? `#${family.businessNumber}` : ''}</p><h3>{family.address}</h3></div><span>{family.members.length} thành viên</span></header>
    {family.members.length === 0 ? <p className="empty-members">Thêm ít nhất một thành viên để có thể lưu.</p> : <ul className="member-list">
      {family.members.map((member) => <SortableMember key={member.id} member={member} onArchive={onArchiveMember ? () => onArchiveMember(member.id) : undefined} />)}
    </ul>}
  </article>;
}
