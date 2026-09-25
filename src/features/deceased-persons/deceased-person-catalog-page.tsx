'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { DeceasedPersonForm } from './deceased-person-form';
import { deceasedPersonCatalogReducer } from './deceased-person-catalog-state';
import { searchDeceasedPerson } from './deceased-person-domain';
import { DeceasedPersonImportDialog } from './deceased-person-import-dialog';
import { DeceasedPerson } from './deceased-person-domain';
import { createDeceasedPerson, importDeceasedPeople, listDeceasedPeople } from './deceased-person-repository';

export function DeceasedPersonCatalogPage() {
  const [state, dispatch] = useReducer(deceasedPersonCatalogReducer, { people: [] }); const [query, setQuery] = useState(''); const [importOpen, setImportOpen] = useState(false); const [loadError, setLoadError] = useState(''); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => { setLoading(true); try { const people = await listDeceasedPeople(); dispatch({ type: 'catalog-loaded', people }); setLoadError(''); } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Không thể tải danh mục.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void reload(); }, [reload]);
  async function addPerson(person: DeceasedPerson) { await createDeceasedPerson(person); await reload(); }
  async function importPeople(people: DeceasedPerson[]) { await importDeceasedPeople(people); await reload(); }
  const results = state.people.filter((person) => searchDeceasedPerson(person, query));
  return <section className="page catalog-page"><div className="page-heading"><div><p className="eyebrow">CẦU SIÊU</p><h1>Danh sách người đã mất</h1><p>Lưu họ tên, pháp danh, ngày mất và người đăng ký. Thông tin hộ gia đình là tùy chọn.</p></div><button type="button" onClick={() => setImportOpen(true)}>Import CSV</button></div>{loadError && <p role="alert" className="notice">{loadError}</p>}<div className="catalog-layout"><DeceasedPersonForm codes={state.people.map((person) => person.code)} onAdd={addPerson} /><section className="catalog-list"><div className="catalog-list-heading"><h2>Danh mục đã lưu</h2><label>Tìm theo mã hoặc tên<input aria-label="Tìm theo mã hoặc tên" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>{loading ? <p className="empty-panel">Đang tải danh mục…</p> : results.length === 0 ? <p className="empty-panel">Chưa có người đã mất trong danh mục.</p> : <div className="catalog-table-wrap"><table><thead><tr><th>Mã số</th><th>Họ tên / pháp danh</th><th>Ngày mất</th><th>Hộ / gia đình</th><th>Người đăng ký</th></tr></thead><tbody>{results.map((person) => <tr key={person.code}><td>{person.code}</td><td>{person.fullName}{person.dharmaName && <small>{person.dharmaName}</small>}</td><td>{person.dateOfDeath}</td><td>{person.householdReference && person.familyReference ? `${person.householdReference} / ${person.familyReference}` : 'Không gắn hộ'}</td><td>{person.createdBy}</td></tr>)}</tbody></table></div>}</section></div>{importOpen && <DeceasedPersonImportDialog existingCodes={state.people.map((person) => person.code)} onClose={() => setImportOpen(false)} onConfirm={importPeople} />}</section>;
}
