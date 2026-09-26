'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Household } from './household-domain';
import { getHouseholdWorkspace } from './household-repository';
import { formatLunarDayMonth, formatSolarAsLunar } from '../calendar/lunar-date-domain';
import { createHouseholdWellbeingRegistration, createMemorialRegistration } from '../prayer/prayer-repository';
import { PrayerRegistrationDialog } from '../prayer/prayer-registration-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

function PrayerHistory({ history }: { history: Array<{ date: string; period: 'morning' | 'afternoon' | 'evening' }> }) {
  if (!history.length) return <small className="prayer-history-empty">Chưa có đăng ký</small>;
  return <ul className="prayer-history">{history.map((entry, index) => <li key={`${entry.date}-${index}`}>{formatSolarAsLunar(entry.date)} · {({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' })[entry.period]}</li>)}</ul>;
}

export function HouseholdDetailWorkspace({ householdId }: { householdId: string }) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWellbeingDialog, setShowWellbeingDialog] = useState(false);
  const [memorialId, setMemorialId] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try { setHousehold(await getHouseholdWorkspace(householdId)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể tải hộ gia đình.'); }
    finally { setLoading(false); }
  }, [householdId]);
  useEffect(() => { void reload(); }, [reload]);

  function toggleMember(id: string) {
    setSelectedMemberIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }
  if (loading && !household) return <section className="page"><p role="status">Đang tải thông tin hộ…</p></section>;
  if (error && !household) return <section className="page"><p role="alert" className="notice">{error}</p><Link href="/households">Quay lại danh sách hộ</Link></section>;
  if (!household) return null;

  const selectedMemorial = household.families.flatMap((family) => family.deceasedPeople ?? []).find((person) => person.id === memorialId);
  return <section className="page household-detail-page">
    <p className="eyebrow">HỘ GIA ĐÌNH</p><h1>Hộ #{household.businessNumber}</h1><p>{household.oldNumber ? `Mã cũ #${household.oldNumber} · ` : ''}{household.families.length} gia đình ở các địa chỉ khác nhau.</p>
    {error && <p role="alert" className="notice">{error}</p>}
    <section className="group-prayer-panel"><div><p className="eyebrow">CẦU AN THEO HỘ</p><h2>Chọn thành viên từ một hoặc nhiều gia đình</h2><p>Danh sách được gửi trong một đăng ký chung của hộ gia đình.</p></div><Button type="button" disabled={!selectedMemberIds.length} onClick={() => setShowWellbeingDialog(true)}>Đăng ký Cầu an ({selectedMemberIds.length})</Button></section>
    <div className="family-grid household-detail-families">{household.families.map((family) => <Card className="family-card detail-family-card" key={family.id}>
      <header><div><p>GIA ĐÌNH #{family.businessNumber}</p><h2>{family.address}</h2></div><span>{family.members.length} thành viên</span></header>
      <section className="detail-subsection"><h3>Thành viên · chọn cho Cầu an</h3>{family.members.length ? <ul className="detail-person-list">{family.members.map((member) => <li key={member.id}><Label className="prayer-member-choice"><Checkbox checked={selectedMemberIds.includes(member.id)} onCheckedChange={() => toggleMember(member.id)} /><span><strong>{member.fullName}</strong>{member.dharmaName && <small>Pháp danh: {member.dharmaName}</small>}</span></Label><PrayerHistory history={member.prayerHistory ?? []} /></li>)}</ul> : <p className="empty-members">Chưa có thành viên.</p>}</section>
      <section className="detail-subsection"><h3>Hương linh trong gia đình</h3>{family.deceasedPeople?.length ? <ul className="detail-person-list">{family.deceasedPeople.map((person) => <li key={person.id}><span><strong>{person.fullName}</strong><small>{person.code}{person.dharmaName ? ` · Pháp danh: ${person.dharmaName}` : ''}</small><small>Ngày mất: {formatLunarDayMonth(person.dateOfDeath)}</small></span><div><PrayerHistory history={person.prayerHistory} /><Button type="button" variant="catalog" onClick={() => setMemorialId(person.id)}>Đăng ký Cầu siêu</Button></div></li>)}</ul> : <p className="prayer-history-empty">Chưa có hương linh gắn với gia đình này. <Link href="/huong-linh">Quản lý hương linh</Link></p>}</section>
    </Card>)}</div>
    {showWellbeingDialog && <PrayerRegistrationDialog title={`Cầu an cho ${selectedMemberIds.length} thành viên · hộ #${household.businessNumber}`} onClose={() => setShowWellbeingDialog(false)} onSubmit={async (date, period) => { await createHouseholdWellbeingRegistration(household.id, selectedMemberIds, date, period); setSelectedMemberIds([]); await reload(); }} />}
    {selectedMemorial && <PrayerRegistrationDialog title={`Cầu siêu · ${selectedMemorial.fullName}`} onClose={() => setMemorialId(null)} onSubmit={async (date, period) => { await createMemorialRegistration(selectedMemorial.id, date, period); await reload(); }} />}
  </section>;
}
