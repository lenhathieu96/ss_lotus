'use client';

import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { formatLunarDayMonth, formatSolarAsLunar } from '@features/calendar/lunar-date-domain';
import { createMemorialRegistration, bookHouseholdWellbeingSlot } from '@features/prayer/prayer-repository';
import { PrayerRegistrationDialog } from '@features/prayer/components/prayer-registration-dialog';
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
  const [address, setAddress] = useState('');
  const [memberName, setMemberName] = useState('');
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [splitSourceId, setSplitSourceId] = useState('');
  const [splitMemberId, setSplitMemberId] = useState('');
  const [splitAddress, setSplitAddress] = useState('');
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
    if (!household || !event.over || event.active.id === event.over.id) return;
    const source = household.families.find((family) => family.members.some((member) => member.id === event.active.id));
    const target = household.families.find((family) => family.members.some((member) => member.id === event.over?.id));
    if (!source || !target) return;
    const fromIndex = source.members.findIndex((member) => member.id === event.active.id);
    const toIndex = target.members.findIndex((member) => member.id === event.over?.id);
    dispatch(source.id === target.id ? { type: 'members-reordered', familyId: source.id, fromIndex, toIndex } : { type: 'member-moved', memberId: String(event.active.id), fromFamilyId: source.id, toFamilyId: target.id, toIndex });
  }
  async function save() {
    if (!household || !state.canSave || saving) return;
    setSaving(true); setError('');
    try { const canonical = await saveHouseholdWorkspace(household); setBaseline(canonical); dispatch({ type: 'loaded', household: canonical }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu hộ gia đình.'); }
    finally { setSaving(false); }
  }
  async function book(slotId: string) {
    if (!household || state.isDirty || saving || household.revision === undefined) return;
    const canonical = await bookHouseholdWellbeingSlot(household.id, household.revision, slotId);
    setBaseline(canonical); dispatch({ type: 'loaded', household: canonical });
  }
  function addFamily(event: React.FormEvent) { event.preventDefault(); if (!address.trim()) return; dispatch({ type: 'family-added', address }); setAddress(''); }
  function addMember(event: React.FormEvent) {
    event.preventDefault(); if (!targetFamilyId || !memberName.trim()) return;
    const member: Member = { id: nextMemberId(), fullName: memberName };
    dispatch({ type: 'member-added', familyId: targetFamilyId, member }); setMemberName('');
  }
  function mergeFamilies(event: React.FormEvent) { event.preventDefault(); if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return; dispatch({ type: 'families-merged', sourceFamilyId: mergeSourceId, targetFamilyId: mergeTargetId }); setMergeSourceId(''); setMergeTargetId(''); }
  function splitFamily(event: React.FormEvent) { event.preventDefault(); if (!splitSourceId || !splitMemberId || !splitAddress.trim()) return; dispatch({ type: 'family-split', sourceFamilyId: splitSourceId, memberId: splitMemberId, address: splitAddress, familyId: `family-${crypto.randomUUID()}` }); setSplitSourceId(''); setSplitMemberId(''); setSplitAddress(''); }

  if (loading && !household) return <section className="page"><p role="status">Đang tải thông tin hộ…</p></section>;
  if (error && !household) return <section className="page"><p role="alert" className="notice">{error}</p><Link href="/households">Quay lại Cầu An</Link></section>;
  if (!household) return null;
  const selectedMemorial = household.families.flatMap((family) => family.deceasedPeople ?? []).find((person) => person.id === memorialId);
  const canBook = !state.isDirty && !saving && household.revision !== undefined;

  return <section className="page household-detail-page">
    <header className="household-detail-header"><div><p className="eyebrow">CẦU AN · HỘ #{household.businessNumber}</p><h1>Chủ hộ: {household.headMember?.fullName ?? 'Chưa xác định'}</h1><p>{household.families.length} gia đình · {household.families.reduce((total, family) => total + family.members.length, 0)} thành viên</p></div><div className="wellbeing-header-summary"><strong>{household.wellbeingBooking ? `${({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' })[household.wellbeingBooking.period]} · ${household.wellbeingBooking.solarDate}` : 'Chưa có lịch Cầu An'}</strong></div></header>
    {error && <p role="alert" className="notice">{error}</p>}
    <section className="household-inline-editor" aria-label="Chỉnh sửa cấu trúc hộ"><form onSubmit={addFamily}><Label>Địa chỉ gia đình mới<Input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ví dụ: 12 Lê Lợi" /></Label><Button type="submit" variant="secondary"><Plus aria-hidden="true" /> Thêm gia đình</Button></form><form onSubmit={addMember}><Label>Thành viên mới<Input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Họ và tên" /></Label><select aria-label="Gia đình nhận thành viên" value={targetFamilyId} onChange={(event) => setTargetFamilyId(event.target.value)}><option value="">Chọn gia đình</option>{household.families.map((family) => <option value={family.id} key={family.id}>{family.address}</option>)}</select><Button type="submit" variant="secondary" disabled={!targetFamilyId}><Plus aria-hidden="true" /> Thêm thành viên</Button></form><form onSubmit={mergeFamilies}><Label>Gộp gia đình<select aria-label="Gia đình nguồn để gộp" value={mergeSourceId} onChange={(event) => setMergeSourceId(event.target.value)}><option value="">Gia đình nguồn</option>{household.families.map((family) => <option value={family.id} key={family.id}>{family.address}</option>)}</select></Label><select aria-label="Gia đình đích để gộp" value={mergeTargetId} onChange={(event) => setMergeTargetId(event.target.value)}><option value="">Gộp vào gia đình</option>{household.families.filter((family) => family.id !== mergeSourceId).map((family) => <option value={family.id} key={family.id}>{family.address}</option>)}</select><Button type="submit" variant="secondary" disabled={!mergeSourceId || !mergeTargetId}>Gộp gia đình</Button></form><form onSubmit={splitFamily}><Label>Tách thành viên<select aria-label="Gia đình cần tách" value={splitSourceId} onChange={(event) => { setSplitSourceId(event.target.value); setSplitMemberId(''); }}><option value="">Gia đình nguồn</option>{household.families.filter((family) => family.members.length > 1).map((family) => <option value={family.id} key={family.id}>{family.address}</option>)}</select></Label><select aria-label="Thành viên cần tách" value={splitMemberId} onChange={(event) => setSplitMemberId(event.target.value)}><option value="">Chọn thành viên</option>{household.families.find((family) => family.id === splitSourceId)?.members.map((member) => <option value={member.id} key={member.id}>{member.fullName}</option>)}</select><Input value={splitAddress} onChange={(event) => setSplitAddress(event.target.value)} placeholder="Địa chỉ gia đình mới" /><Button type="submit" variant="secondary" disabled={!splitMemberId || !splitAddress.trim()}>Tách gia đình</Button></form></section>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={household.families.flatMap((family) => family.members.map((member) => member.id))} strategy={verticalListSortingStrategy}><div className="family-grid household-detail-families">{household.families.map((family) => <FamilyCard key={family.id} family={family} onArchiveMember={(memberId) => dispatch({ type: 'member-archived', familyId: family.id, memberId })} />)}</div></SortableContext></DndContext>
    <section className="household-history"><h2>Hương linh và lịch sử</h2>{household.families.flatMap((family) => family.deceasedPeople ?? []).map((person) => <Card key={person.id} className="household-history-card"><div><strong>{person.fullName}</strong><small>{person.code}{person.dharmaName ? ` · Pháp danh: ${person.dharmaName}` : ''} · Ngày mất: {formatLunarDayMonth(person.dateOfDeath)}</small><PrayerHistory history={person.prayerHistory} /></div><Button type="button" variant="catalog" onClick={() => setMemorialId(person.id)}>Đăng ký Cầu siêu</Button></Card>)}</section>
    <HouseholdActionDock dirty={state.isDirty} saving={saving} canSave={state.canSave} canBook={canBook} hasBooking={Boolean(household.wellbeingBooking)} onSave={() => void save()} onDiscard={() => { if (baseline) dispatch({ type: 'loaded', household: baseline }); }} onBook={() => setShowBooking(true)} />
    {showBooking && <WellbeingBookingDialog booking={household.wellbeingBooking} onClose={() => setShowBooking(false)} onSubmit={book} />}
    {selectedMemorial && <PrayerRegistrationDialog title={`Cầu siêu · ${selectedMemorial.fullName}`} onClose={() => setMemorialId(null)} onSubmit={async (date, period) => { await createMemorialRegistration(selectedMemorial.id, date, period); await reload(); }} />}
  </section>;
}
