'use client';

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FormEvent, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Printer, Save, Search, X } from 'lucide-react';
import { FamilyCard } from './family-card';
import { Member } from './household-domain';
import { createDraftHousehold, householdReducer } from './household-reducer';
import { createHousehold, searchHouseholds } from './household-repository';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function nextMemberId() { return `member-${crypto.randomUUID()}`; }

export function HouseholdWorkspace() {
  const router = useRouter();
  const [state, dispatch] = useReducer(householdReducer, undefined, createDraftHousehold);
  const [address, setAddress] = useState('');
  const [memberName, setMemberName] = useState('');
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchHouseholds>>>([]);
  const [searching, setSearching] = useState(false);
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
      router.push(`/households/${saved.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu hộ gia đình.');
    } finally {
      setSaving(false);
    }
  }
  async function findHouseholds(event: FormEvent) {
    event.preventDefault(); setSearching(true); setError(null);
    try { setSearchResults(await searchHouseholds(searchQuery)); }
    catch (searchError) { setError(searchError instanceof Error ? searchError.message : 'Không thể tìm hộ gia đình.'); }
    finally { setSearching(false); }
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
    <div className="page-heading"><div><p className="eyebrow">HỘ GIA ĐÌNH</p><h1>Quản lý hộ khẩu</h1><p>{household?.businessNumber ? `Mã hộ #${household.businessNumber} · ` : ''}Tạo bản nháp, tìm hộ hiện có và quản lý đăng ký Cầu an theo hộ.</p></div><Button type="button" variant="secondary" onClick={() => { setSearchOpen((open) => !open); setSearchResults([]); }}><Search aria-hidden="true" /> Tìm hộ</Button></div>
    {searchOpen && <section className="household-search-panel" aria-label="Tìm hộ gia đình"><form onSubmit={(event) => void findHouseholds(event)}><Label className="form-field">Tìm theo mã hộ, tên thành viên hoặc địa chỉ<Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Nhập mã, tên hoặc địa chỉ" required /></Label><Button disabled={searching}>{searching ? 'Đang tìm…' : 'Tìm kiếm'}</Button></form>{searchResults.length > 0 && <ul>{searchResults.map((result) => <li key={result.id}><Button type="button" variant="ghost" className="household-search-result" onClick={() => router.push(`/households/${result.id}`)}><strong>Hộ #{result.businessNumber}</strong>{result.legacyNumber && <span>Mã cũ #{result.legacyNumber}</span>}<span>{result.addresses.join(' · ')}</span></Button></li>)}</ul>}{!searching && searchQuery && searchResults.length === 0 && <p role="status">Không tìm thấy hộ phù hợp.</p>}</section>}
    {error && <p className="notice" role="alert">{error}</p>}
    <section className="household-actions" aria-label="Thêm dữ liệu hộ gia đình">
      <form onSubmit={addFamily}><Label className="form-field">Địa chỉ gia đình<Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ví dụ: 12 Lê Lợi" required /></Label><Button type="submit"><Plus aria-hidden="true" /> Thêm gia đình</Button></form>
      {household && <form onSubmit={addMember}><Label className="form-field">Thành viên<Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Họ và tên" required /></Label><div className="form-field"><Label id="family-select-label">Gia đình</Label><Select value={selectedFamilyId} onValueChange={setSelectedFamilyId} required><SelectTrigger aria-labelledby="family-select-label"><SelectValue placeholder="Chọn gia đình" /></SelectTrigger><SelectContent>{household.families.map((family) => <SelectItem key={family.id} value={family.id}>{family.address}</SelectItem>)}</SelectContent></Select></div><Button type="submit"><Plus aria-hidden="true" /> Thêm thành viên</Button></form>}
    </section>
    {!household ? <section className="empty-panel"><Search aria-hidden="true" /><h2>Chưa mở hộ gia đình</h2><p>Tìm một hộ hiện có hoặc thêm gia đình đầu tiên để tạo bản nháp.</p></section> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={household.families.flatMap((family) => family.members.map((member) => member.id))} strategy={verticalListSortingStrategy}><div className="family-grid">{household.families.map((family) => <FamilyCard key={family.id} family={family} onRemoveMember={(memberId) => dispatch({ type: 'member-removed', familyId: family.id, memberId })} />)}</div></SortableContext></DndContext>}
    {household && <footer className="editor-footer"><Button type="button" variant="ghost" className="text-button" onClick={() => setConfirmDiscard(true)}><X aria-hidden="true" /> Đóng và bỏ bản nháp</Button><span>{state.canSave ? 'Sẵn sàng lưu thay đổi' : 'Mỗi gia đình cần có ít nhất một thành viên.'}</span><div><Button type="button" disabled={!state.canSave || saving} onClick={() => void save()}><Save aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button><Button type="button" disabled={!state.canPrint} variant="secondary"><Printer aria-hidden="true" /> In A5</Button></div></footer>}
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bỏ bản nháp</AlertDialogTitle><AlertDialogDescription>Các thay đổi chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Ở lại</AlertDialogCancel><AlertDialogAction onClick={() => { dispatch({ type: 'cleared' }); setConfirmDiscard(false); }}>Bỏ bản nháp</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
