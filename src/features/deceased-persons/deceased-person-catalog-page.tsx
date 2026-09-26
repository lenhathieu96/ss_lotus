"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeceasedPersonForm } from "./deceased-person-form";
import { deceasedPersonCatalogReducer } from "./deceased-person-catalog-state";
import { DeceasedPerson, searchDeceasedPerson } from "./deceased-person-domain";
import { DeceasedPersonImportDialog } from "./deceased-person-import-dialog";
import { createDeceasedPerson, importDeceasedPeople, listDeceasedPeople, updateDeceasedPersonAssociation } from "./deceased-person-repository";
import { formatLunarDayMonth, formatSolarAsLunar } from "../calendar/lunar-date-domain";
import { createMemorialRegistration } from "../prayer/prayer-repository";
import { PrayerRegistrationDialog } from "../prayer/prayer-registration-dialog";

export function DeceasedPersonCatalogPage() {
  const [state, dispatch] = useReducer(deceasedPersonCatalogReducer, { people: [] });
  const [query, setQuery] = useState("");
  const createTriggerRef = useRef<HTMLButtonElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [association, setAssociation] = useState({ householdReference: "", familyReference: "" });
  const [savingAssociation, setSavingAssociation] = useState(false);
  const [prayingFor, setPrayingFor] = useState<DeceasedPerson | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try { dispatch({ type: "catalog-loaded", people: await listDeceasedPeople() }); setLoadError(""); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Không thể tải danh mục."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function addPerson(person: DeceasedPerson) { await createDeceasedPerson(person); setCreateOpen(false); await reload(); }
  async function importPeople(people: DeceasedPerson[]) { await importDeceasedPeople(people); await reload(); }
  async function saveAssociation(person: DeceasedPerson) {
    setSavingAssociation(true);
    try { await updateDeceasedPersonAssociation({ ...person, ...association }); setEditing(null); await reload(); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : "Không thể cập nhật liên kết hộ gia đình."); }
    finally { setSavingAssociation(false); }
  }
  const results = state.people.filter((person) => searchDeceasedPerson(person, query));

  return <section className="page catalog-page">
    <div className="page-heading"><div><p className="eyebrow">HƯƠNG LINH</p><h1>Quản lý hương linh</h1><p>Tra cứu theo mã số, họ tên hoặc pháp danh. Có thể bổ sung liên kết hộ gia đình sau này.</p></div><div className="catalog-page-actions"><Button type="button" variant="catalog" onClick={() => setImportOpen(true)}>Import CSV</Button><Button ref={createTriggerRef} type="button" variant="catalog" onClick={(event) => { event.currentTarget.focus(); setCreateOpen(true); }}>Thêm hương linh</Button></div></div>
    {loadError && <p role="alert" className="notice">{loadError}</p>}
    <Card className="catalog-list" aria-labelledby="catalog-heading"><div className="catalog-list-heading"><div><h2 id="catalog-heading">Tra cứu hương linh</h2><p>Tìm theo mã số, họ tên hoặc pháp danh</p></div><Label className="catalog-search"><span className="visually-hidden">Tìm theo mã, họ tên hoặc pháp danh</span><Input type="search" aria-label="Tìm theo mã, họ tên hoặc pháp danh" placeholder="Nhập mã số, họ tên hoặc pháp danh" value={query} onChange={(event) => setQuery(event.target.value)} /></Label></div>
      {loading ? <div className="empty-panel" role="status"><Skeleton className="h-8 w-48" /><span>Đang tải danh mục…</span></div> : results.length === 0 ? <div className="empty-panel">Chưa có hương linh phù hợp.</div> : <div className="catalog-table-wrap"><Table><TableHeader><TableRow><TableHead>Mã số</TableHead><TableHead>Họ tên / pháp danh</TableHead><TableHead>Ngày mất âm lịch</TableHead><TableHead>Hộ / gia đình</TableHead><TableHead>Cầu siêu</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader><TableBody>{results.map((person) => <TableRow key={person.id ?? person.code}><TableCell>{person.code}</TableCell><TableCell>{person.fullName}{person.dharmaName && <small>Pháp danh: {person.dharmaName}</small>}<small>Người đăng ký: {person.createdBy}</small></TableCell><TableCell>{formatLunarDayMonth(person.dateOfDeath)}</TableCell><TableCell>{editing === person.id ? <div className="association-editor"><Label className="form-field">Mã hộ<Input inputMode="numeric" value={association.householdReference} onChange={(event) => setAssociation({ ...association, householdReference: event.target.value })} /></Label><Label className="form-field">Mã gia đình<Input inputMode="numeric" value={association.familyReference} onChange={(event) => setAssociation({ ...association, familyReference: event.target.value })} /></Label><small>Để trống cả hai để gỡ liên kết.</small></div> : person.householdReference && person.familyReference ? `${person.householdReference} / ${person.familyReference}` : "Chưa gắn hộ"}</TableCell><TableCell>{person.prayerHistory?.length ? person.prayerHistory.map((history, index) => <small key={`${history.date}-${index}`}>{formatSolarAsLunar(history.date)} · {{ morning: "Sáng", afternoon: "Chiều", evening: "Tối" }[history.period]}</small>) : <small>Chưa đăng ký</small>}</TableCell><TableCell className="catalog-actions">{editing === person.id ? <><Button type="button" size="sm" disabled={savingAssociation} onClick={() => void saveAssociation(person)}>{savingAssociation ? "Đang lưu…" : "Lưu"}</Button><Button type="button" variant="catalog" size="sm" onClick={() => setEditing(null)}>Hủy</Button></> : <><Button type="button" size="sm" onClick={() => setPrayingFor(person)}>Đăng ký Cầu siêu</Button><Button type="button" variant="catalog" size="sm" onClick={() => { setAssociation({ householdReference: person.householdReference ?? "", familyReference: person.familyReference ?? "" }); setEditing(person.id ?? null); }}>Liên kết hộ</Button></>}</TableCell></TableRow>)}</TableBody></Table></div>}
    </Card>
    {createOpen && <DeceasedPersonForm codes={state.people.map((person) => person.code)} onAdd={addPerson} onClose={() => setCreateOpen(false)} focusReturnTarget={() => createTriggerRef.current} />}
    {importOpen && <DeceasedPersonImportDialog existingCodes={state.people.map((person) => person.code)} onClose={() => setImportOpen(false)} onConfirm={importPeople} />}
    {prayingFor && <PrayerRegistrationDialog title={`Đăng ký Cầu siêu · ${prayingFor.fullName}`} onClose={() => setPrayingFor(null)} onSubmit={async (date, period) => { await createMemorialRegistration(prayingFor.id!, date, period); await reload(); }} />}
  </section>;
}
