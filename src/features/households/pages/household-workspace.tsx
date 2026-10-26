'use client';

import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FormEvent, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Home, Plus, Printer, Save, Search, X } from 'lucide-react';
import { FamilyCard } from '../components/family-card';
import { Member } from '../household-repository';
import { createDraftHousehold, householdReducer } from '../household-repository';
import { createHousehold, searchHouseholds } from '../household-repository';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@components/ui/alert-dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof searchHouseholds>>>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const searchRequestId = useRef(0);
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
    event.preventDefault();
    if (!searchQuery.trim() || searching) return;
    const requestId = searchRequestId.current + 1;
    const query = searchQuery.trim();
    searchRequestId.current = requestId;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSearchResults([]);
    try {
      const results = await searchHouseholds(query);
      if (requestId === searchRequestId.current) setSearchResults(results);
    } catch (searchError) {
      if (requestId === searchRequestId.current) setSearchError(searchError instanceof Error ? searchError.message : 'Không thể tìm hộ gia đình.');
    } finally {
      if (requestId === searchRequestId.current) setSearching(false);
    }
  }
  function updateSearchQuery(query: string) {
    searchRequestId.current += 1;
    setSearchQuery(query);
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setSearching(false);
  }
  function onDragEnd(event: DragEndEvent) {
    if (!household || !event.over || event.active.id === event.over.id) return;
    const source = household.families.find((family) => family.members.some((member) => member.id === event.active.id));
    const destination = household.families.find((family) => `family-target:${family.id}` === event.over?.id || family.members.some((member) => member.id === event.over?.id));
    if (!source || !destination) return;
    const fromIndex = source.members.findIndex((member) => member.id === event.active.id);
    const overIndex = destination.members.findIndex((member) => member.id === event.over?.id);
    const toIndex = overIndex < 0 ? destination.members.length : overIndex;
    if (source.id === destination.id) {
      dispatch({ type: 'members-reordered', familyId: source.id, fromIndex, toIndex });
      return;
    }
    dispatch({ type: 'member-moved', memberId: String(event.active.id), fromFamilyId: source.id, toFamilyId: destination.id, toIndex });
  }

  return <section className="page household-page">
    <h1 className="sr-only">Cầu An</h1>
    {creating ? <Button type="button" variant="ghost" className="household-back-to-search" onClick={() => setCreating(false)}><ArrowLeft aria-hidden="true" /> Quay lại tra cứu</Button> : <>
      <section className="household-search-panel" aria-label="Tìm hộ gia đình">
        <form role="search" onSubmit={(event) => void findHouseholds(event)}>
          <Label htmlFor="household-query">Mã hộ, mã gia đình, họ tên, pháp danh hoặc địa chỉ</Label>
          <div className="household-search-line">
            <div className="household-input-icon"><Search aria-hidden="true" /><Input id="household-query" value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} placeholder="Nhập thông tin để tìm hộ…" aria-describedby="household-search-help" autoComplete="off" required />{searchQuery && <Button type="button" variant="ghost" className="household-clear-query" aria-label="Xóa từ khóa tìm kiếm" onClick={() => updateSearchQuery('')}><X aria-hidden="true" /></Button>}</div>
            <Button disabled={searching}>{searching ? 'Đang tìm…' : 'Tìm kiếm'}<ArrowRight aria-hidden="true" /></Button>
          </div>
          <div className="household-search-hints" id="household-search-help">Nhập có dấu hoặc không dấu, rồi nhấn Enter</div>
        </form>
        <div className="household-search-create-row"><p>Chưa có hồ sơ? <span>Thêm hộ mới để bắt đầu đăng ký Cầu An.</span></p><Button type="button" variant="ghost" className="household-add-link" onClick={() => setCreating(true)}><Plus aria-hidden="true" />{household ? 'Tiếp tục bản nháp' : 'Thêm hộ'}</Button></div>
      </section>
      <div className="household-season-note"><strong>Mùng 1 – 15 tháng Giêng âm lịch hằng năm</strong><span>3 khóa mỗi ngày · Sáng / Chiều / Tối · Tối đa 200 hộ / khóa</span></div>
      <div className="household-list-heading"><div><h2>Hồ sơ hộ gia đình</h2><p>Chọn hộ để xem thành viên và đặt lịch Cầu An.</p></div><span role="status" aria-live="polite">{searching ? 'Đang tìm kiếm…' : hasSearched && !searchError ? `${searchResults.length} hộ gia đình` : 'Tra cứu hồ sơ'}</span></div>
      <div className="household-results-table" aria-busy={searching}>
        <div className="household-table-header" aria-hidden="true"><span>MÃ HỘ</span><span>GIA ĐÌNH / ĐỊA CHỈ</span><span>CHỦ HỘ</span><span /></div>
        {searchError ? <div className="household-search-empty" role="alert"><h3>Không thể tìm hộ gia đình</h3><p>{searchError}</p></div> : searching ? <div className="household-search-empty"><Search aria-hidden="true" /><p>Đang tìm hồ sơ phù hợp…</p></div> : searchResults.length > 0 ? searchResults.map((result) => <button key={result.id} type="button" className="household-result-row" onClick={() => router.push(`/households/${result.id}`)}>
          <span className="household-code"><Home aria-hidden="true" />{result.businessNumber}</span>
          <span className="household-address-block"><strong>{result.addresses.join(' · ') || 'Chưa có địa chỉ'}</strong><small>{result.familyCount} gia đình · {result.memberCount} thành viên{result.legacyNumber ? ` · Mã cũ: ${result.legacyNumber}` : ''}</small></span>
          <span className="household-names"><strong>{result.headMember?.fullName ?? 'Chưa xác định chủ hộ'}</strong>{result.headMember?.dharmaName && <small>Pháp danh: {result.headMember.dharmaName}</small>}</span>
          <span className="household-open-result"><ArrowRight aria-hidden="true" /><span className="sr-only">Mở hộ {result.businessNumber}</span></span>
        </button>) : <div className="household-search-empty"><Search aria-hidden="true" /><h3>{hasSearched ? 'Không tìm thấy hộ phù hợp' : 'Tìm hồ sơ hộ gia đình'}</h3><p>{hasSearched ? 'Thử mã hộ, họ tên, pháp danh hoặc địa chỉ khác.' : 'Nhập thông tin ở trên để tra cứu hồ sơ hiện có.'}</p></div>}
        <div className="household-table-footer"><span>Hiển thị tối đa 50 hộ mỗi lần tìm.</span><span>Chọn hộ để xem đầy đủ hồ sơ <ArrowRight aria-hidden="true" /></span></div>
      </div>
    </>}
    {creating && <>
    {error && <p className="notice" role="alert">{error}</p>}
    <div className="household-create-layout"><div>
    <div className="household-editor-intro"><span>01</span><div><h2>Thông tin các gia đình</h2><p>Mỗi gia đình có địa chỉ và danh sách thành viên riêng.</p></div></div>
    <section className="household-actions" aria-label="Thêm dữ liệu hộ gia đình">
      <form onSubmit={addFamily}><Label className="form-field">Địa chỉ gia đình<Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ví dụ: 12 Lê Lợi" required /></Label><Button type="submit"><Plus aria-hidden="true" /> Thêm gia đình</Button></form>
      {household && <form onSubmit={addMember}><Label className="form-field">Thành viên<Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Họ và tên" required /></Label><div className="form-field"><Label id="family-select-label">Gia đình</Label><Select value={selectedFamilyId} onValueChange={setSelectedFamilyId} required><SelectTrigger aria-labelledby="family-select-label"><SelectValue placeholder="Chọn gia đình" /></SelectTrigger><SelectContent>{household.families.map((family) => <SelectItem key={family.id} value={family.id}>{family.address}</SelectItem>)}</SelectContent></Select></div><Button type="submit"><Plus aria-hidden="true" /> Thêm thành viên</Button></form>}
    </section>
    {!household ? <section className="empty-panel"><Search aria-hidden="true" /><h2>Thêm hộ gia đình mới</h2><p>Thêm địa chỉ gia đình đầu tiên, sau đó bổ sung thành viên để lưu hồ sơ.</p></section> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={household.families.flatMap((family) => family.members.map((member) => member.id))} strategy={verticalListSortingStrategy}><div className="family-grid">{household.families.map((family) => <FamilyCard key={family.id} family={family} />)}</div></SortableContext></DndContext>}
    </div><aside className="household-summary" aria-label="Tổng quan bản nháp"><p className="eyebrow">BẢN NHÁP HỘ MỚI</p><h2>Tổng quan hồ sơ</h2><div className="household-summary-counts"><div><strong>{household?.families.length ?? 0}</strong><span>Gia đình</span></div><div><strong>{household?.families.reduce((count, family) => count + family.members.length, 0) ?? 0}</strong><span>Thành viên</span></div></div><div className="household-summary-number"><Home aria-hidden="true" /><div><strong>Mã hộ & mã gia đình</strong><p>Hệ thống tự cấp khi lưu thành công.</p></div></div><p className="household-summary-note">Mỗi gia đình cần địa chỉ và ít nhất một thành viên có họ tên.</p></aside></div>
    {household && <footer className="editor-footer"><Button type="button" variant="ghost" className="text-button" onClick={() => setConfirmDiscard(true)}><X aria-hidden="true" /> Đóng và bỏ bản nháp</Button><span>{state.canSave ? 'Sẵn sàng lưu thay đổi' : 'Mỗi gia đình cần có ít nhất một thành viên.'}</span><div><Button type="button" disabled={!state.canSave || saving} onClick={() => void save()}><Save aria-hidden="true" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}</Button><Button type="button" disabled={!state.canPrint} variant="secondary"><Printer aria-hidden="true" /> In A5</Button></div></footer>}
    </>}
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Bỏ bản nháp</AlertDialogTitle><AlertDialogDescription>Các thay đổi chưa lưu sẽ bị mất. Bạn có muốn tiếp tục?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Ở lại</AlertDialogCancel><AlertDialogAction onClick={() => { dispatch({ type: 'cleared' }); setConfirmDiscard(false); setCreating(false); setSelectedFamilyId(''); setAddress(''); setMemberName(''); setError(null); }}>Bỏ bản nháp</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
