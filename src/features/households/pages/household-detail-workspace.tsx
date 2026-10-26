'use client';

import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { formatLunarDayMonth, formatSolarAsLunar } from '@features/calendar/lunar-date-domain';
import { createMemorialRegistration, bookHouseholdWellbeingSlot } from '@features/prayer/prayer-repository';
import { PrayerRegistrationDialog } from '@features/prayer/components/prayer-registration-dialog';
import { FamilyOperationDialog, type FamilyOperation, type FamilyOperationValues } from '../components/family-operation-dialog';
import { FamilyCard } from '../components/family-card';
import { HouseholdActionDock } from '../components/household-action-dock';
import { WellbeingBookingDialog } from '../components/wellbeing-booking-dialog';
import { createDraftHousehold, getHouseholdWorkspace, householdReducer, type Household, type Member, saveHouseholdWorkspace } from '../household-repository';

function PrayerHistory({ history }: { history: Array<{ date: string; period: 'morning' | 'afternoon' | 'evening' }> }) {
  if (!history.length) return <small className="prayer-history-empty">Chưa có đăng ký</small>;
  return <ul className="prayer-history">{history.map((entry, index) => <li key={`${entry.date}-${index}`}>{formatSolarAsLunar(entry.date)} · {({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' })[entry.period]}</li>)}</ul>;
}
function nextMemberId() { return `member-${crypto.randomUUID()}`; }

export function HouseholdDetailWorkspace({ householdId }: { householdId: string }) {
  const [state, dispatch] = useReducer(householdReducer, undefined, createDraftHousehold);
  const [baseline, setBaseline] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [memorialId, setMemorialId] = useState<string | null>(null);
  const [operation, setOperation] = useState<FamilyOperation | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const household = state.household;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const canonical = await getHouseholdWorkspace(householdId);
      setBaseline(canonical); dispatch({ type: 'loaded', household: canonical }); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải hộ gia đình.'); }
    finally { setLoading(false); }
  }, [householdId]);
  useEffect(() => { void reload(); }, [reload]);

  function onDragEnd(event: DragEndEvent) {
    if (saving || !household || !event.over || event.active.id === event.over.id) return;
    const source = household.families.find((family) => family.members.some((member) => member.id === event.active.id));
    const target = household.families.find((family) => `family-target:${family.id}` === event.over?.id || family.members.some((member) => member.id === event.over?.id));
    if (!source || !target) return;
    const fromIndex = source.members.findIndex((member) => member.id === event.active.id);
    const overIndex = target.members.findIndex((member) => member.id === event.over?.id);
    const toIndex = overIndex < 0 ? target.members.length : overIndex;
    dispatch(source.id === target.id ? { type: 'members-reordered', familyId: source.id, fromIndex, toIndex } : { type: 'member-moved', memberId: String(event.active.id), fromFamilyId: source.id, toFamilyId: target.id, toIndex });
  }
  async function save() {
    if (!household || !state.canSave || saving) return;
    setSaving(true); setError('');
    try { const canonical = await saveHouseholdWorkspace(household); setBaseline(canonical); dispatch({ type: 'loaded', household: canonical }); setSelectedIds([]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu hộ gia đình.'); }
    finally { setSaving(false); }
  }
  async function book(slotId: string) {
    if (!household || state.isDirty || saving || household.revision === undefined) return;
    const canonical = await bookHouseholdWellbeingSlot(household.id, household.revision, slotId);
    setBaseline(canonical); dispatch({ type: 'loaded', household: canonical });
  }
  function applyOperation(values: FamilyOperationValues) {
    if (!household || saving) return;
    const { address, name, dharmaName, yearOfBirth, sourceId, targetId } = values;
    if (operation === 'add-family') dispatch({ type: 'family-added', address });
    if (operation === 'add-member') {
      const member: Member = { id: nextMemberId(), fullName: name, dharmaName, yearOfBirth };
      dispatch({ type: 'member-added', familyId: targetId, member });
    }
    if (operation === 'merge') dispatch({ type: 'families-merged', sourceFamilyId: sourceId, targetFamilyId: targetId });
    if (operation === 'split' && selectedIds.length === 1) dispatch({ type: 'family-split', sourceFamilyId: sourceId, memberId: selectedIds[0], address, familyId: `family-${crypto.randomUUID()}` });
    if (operation === 'move' || operation === 'archive') {
      let toIndex = household.families.find((family) => family.id === targetId)?.members.length ?? 0;
      for (const memberId of selectedIds) {
        const source = household.families.find((family) => family.members.some((member) => member.id === memberId));
        if (!source) continue;
        if (operation === 'archive') dispatch({ type: 'member-archived', familyId: source.id, memberId });
        else if (source.id !== targetId) dispatch({ type: 'member-moved', memberId, fromFamilyId: source.id, toFamilyId: targetId, toIndex: toIndex++ });
      }
    }
    setSelectedIds([]); setOperation(null);
  }
  function toggleMember(memberId: string) { setSelectedIds((ids) => ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]); }

  if (loading && !household) return <section className="page"><p role="status">Đang tải thông tin hộ…</p></section>;
  if (error && !household) return <section className="page"><p role="alert" className="notice">{error}</p><Link href="/households">Quay lại Cầu An</Link></section>;
  if (!household) return null;
  const selectedMemorial = household.families.flatMap((family) => family.deceasedPeople ?? []).find((person) => person.id === memorialId);
  const canBook = !state.isDirty && !saving && household.revision !== undefined;

  return <section className="page household-detail-page">
    <Link className="household-back-link" href="/households">← Trở lại kết quả tìm kiếm</Link>
    <header className="household-detail-header"><div><p className="eyebrow">CẦU AN · HỘ #{household.businessNumber}</p><h1>Chủ hộ: {household.headMember?.fullName ?? 'Chưa xác định'}</h1><p>{household.families.length} gia đình · {household.families.reduce((total, family) => total + family.members.length, 0)} thành viên</p></div><div className="wellbeing-header-summary"><strong>{household.wellbeingBooking ? `${({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' })[household.wellbeingBooking.period]} · ${formatSolarAsLunar(household.wellbeingBooking.solarDate)}` : 'Chưa có lịch Cầu An'}</strong></div></header>
    {error && <p role="alert" className="notice">{error}</p>}
    <section className="family-workspace" aria-labelledby="families-title"><div className="family-workspace-heading"><p className="eyebrow">CẤU TRÚC HỘ GIA ĐÌNH</p><h2 id="families-title">Gia đình & thành viên</h2><p>Chọn thành viên rồi thao tác tại thanh nổi bên dưới, hoặc kéo tay nắm để di chuyển.</p></div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={household.families.flatMap((family) => family.members.map((member) => member.id))} strategy={verticalListSortingStrategy}><div className="family-grid household-detail-families">{household.families.map((family) => <FamilyCard key={family.id} family={family} selectedIds={selectedIds} headMemberId={household.headMember?.id} disabled={saving} onSelectMember={toggleMember} onSelectAll={() => setSelectedIds((ids) => family.members.every((member) => ids.includes(member.id)) ? ids.filter((id) => !family.members.some((member) => member.id === id)) : [...new Set([...ids, ...family.members.map((member) => member.id)])])} />)}</div></SortableContext></DndContext></section>
    <section className="household-history"><h2>Hương linh và lịch sử</h2>{household.families.flatMap((family) => family.deceasedPeople ?? []).map((person) => <Card key={person.id} className="household-history-card"><div><strong>{person.fullName}</strong><small>{person.code}{person.dharmaName ? ` · Pháp danh: ${person.dharmaName}` : ''} · Ngày mất: {formatLunarDayMonth(person.dateOfDeath)}</small><PrayerHistory history={person.prayerHistory} /></div><Button type="button" variant="catalog" onClick={() => setMemorialId(person.id)}>Đăng ký Cầu siêu</Button></Card>)}</section>
    <HouseholdActionDock selectedCount={selectedIds.length} familyCount={household.families.length} canSplit={selectedIds.length === 1 && household.families.some((family) => family.members.length > 1 && family.members.some((member) => member.id === selectedIds[0]))} onOperation={setOperation} onClearSelection={() => setSelectedIds([])} dirty={state.isDirty} saving={saving} canSave={state.canSave} canBook={canBook} hasBooking={Boolean(household.wellbeingBooking)} onSave={() => void save()} onDiscard={() => { if (baseline) dispatch({ type: 'loaded', household: baseline }); setSelectedIds([]); }} onBook={() => setShowBooking(true)} />
    {operation && <FamilyOperationDialog operation={operation} families={household.families} selectedIds={selectedIds} saving={saving} onClose={() => setOperation(null)} onSubmit={applyOperation} />}
    {showBooking && <WellbeingBookingDialog booking={household.wellbeingBooking} onClose={() => setShowBooking(false)} onSubmit={book} />}
    {selectedMemorial && <PrayerRegistrationDialog title={`Cầu siêu · ${selectedMemorial.fullName}`} onClose={() => setMemorialId(null)} onSubmit={async (date, period) => { await createMemorialRegistration(selectedMemorial.id, date, period); await reload(); }} />}
  </section>;
}
