'use client';

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FormEvent, useReducer, useState } from 'react';
import { Plus, Printer, Save, Search, X } from 'lucide-react';
import { FamilyCard } from './family-card';
import { Member } from './household-domain';
import { createDraftHousehold, householdReducer } from './household-reducer';
import { createHousehold } from './household-repository';

function nextMemberId() { return `member-${crypto.randomUUID()}`; }

export function HouseholdWorkspace() {
  const [state, dispatch] = useReducer(householdReducer, undefined, createDraftHousehold);
  const [address, setAddress] = useState('');
  const [memberName, setMemberName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const household = state.household;

  function addFamily(event: FormEvent) {
    event.preventDefault();
    if (!address.trim()) return;
    dispatch({ type: 'family-added', address });
    setError(null);
    setAddress('');
  }
  function addMember(event: FormEvent) {
    event.preventDefault();
    if (!selectedFamilyId || !memberName.trim()) return;
    const member: Member = { id: nextMemberId(), fullName: memberName };
    dispatch({ type: 'member-added', familyId: selectedFamilyId, member });
    setError(null);
    setMemberName('');
  }

  async function save() {
    if (!household || !state.canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await createHousehold(household);
      dispatch({ type: 'saved', household: saved });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu hộ gia đình.');
    } finally {
      setSaving(false);
    }
  }
  function onDragEnd(event: DragEndEvent) {
    if (!household || !event.over || event.active.id === event.over.id) return;
    const source = household.families.find((family) => family.members.some((member) => member.id === event.active.id));
    const destination = household.families.find((family) => family.members.some((member) => member.id === event.over?.id));
    if (!source || !destination) return;
    const fromIndex = source.members.findIndex((member) => member.id === event.active.id);
    const toIndex = destination.members.findIndex((member) => member.id === event.over?.id);
    if (source.id === destination.id) {
      dispatch({ type: 'members-reordered', familyId: source.id, fromIndex, toIndex });
      return;
    }
    dispatch({ type: 'member-moved', memberId: String(event.active.id), fromFamilyId: source.id, toFamilyId: destination.id, toIndex });
  }

  return <section className="page household-page">
    <div className="page-heading"><div><p className="eyebrow">HỘ GIA ĐÌNH</p><h1>Quản lý hộ khẩu</h1><p>{household?.businessNumber ? `Mã hộ #${household.businessNumber} · ` : ''}Tạo bản nháp, quản lý gia đình và thành viên trước khi lưu.</p></div><button type="button" className="outline-button"><Search aria-hidden="true" /> Tìm hộ</button></div>
    {error && <p className="notice" role="alert">{error}</p>}
    <section className="household-actions" aria-label="Thêm dữ liệu hộ gia đình">
      <form onSubmit={addFamily}><label>Địa chỉ gia đình<input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ví dụ: 12 Lê Lợi" required /></label><button type="submit"><Plus aria-hidden="true" /> Thêm gia đình</button></form>
      {household && <form onSubmit={addMember}><label>Thành viên<input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Họ và tên" required /></label><label>Gia đình<select value={selectedFamilyId} onChange={(event) => setSelectedFamilyId(event.target.value)} required><option value="">Chọn gia đình</option>{household.families.map((family) => <option key={family.id} value={family.id}>{family.address}</option>)}</select></label><button type="submit"><Plus aria-hidden="true" /> Thêm thành viên</button></form>}
    </section>
    {!household ? <section className="empty-panel"><Search aria-hidden="true" /><h2>Chưa mở hộ gia đình</h2><p>Tìm một hộ hiện có hoặc thêm gia đình đầu tiên để tạo bản nháp.</p></section> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={household.families.flatMap((family) => family.members.map((member) => member.id))} strategy={verticalListSortingStrategy}><div className="family-grid">{household.families.map((family) => <FamilyCard key={family.id} family={family} onRemoveMember={(memberId) => dispatch({ type: 'member-removed', familyId: family.id, memberId })} />)}</div></SortableContext></DndContext>}
    {household && <footer className="editor-footer"><button type="button" className="text-button" onClick={() => setConfirmDiscard(true)}><X aria-hidden="true" /> Đóng và bỏ bản nháp</button><span>{state.canSave ? 'Sẵn sàng lưu thay đổi' : 'Mỗi gia đình cần có ít nhất một thành viên.'}</span><div><button type="button" disabled={!state.canSave || saving} onClick={() => void save()}><Save aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button><button type="button" disabled={!state.canPrint} className="outline-button"><Printer aria-hidden="true" /> In A5</button></div></footer>}
    {confirmDiscard && <div className="dialog-backdrop"><section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title"><h2 id="discard-title">Bỏ bản nháp</h2><p>Các thay đổi chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?</p><div><button type="button" className="outline-button" onClick={() => setConfirmDiscard(false)}>Ở lại</button><button type="button" onClick={() => { dispatch({ type: 'cleared' }); setConfirmDiscard(false); }}>Bỏ bản nháp</button></div></section></div>}
  </section>;
}
