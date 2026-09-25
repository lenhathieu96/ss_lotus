import { FormEvent, useState } from 'react';
import { DeceasedPerson, normalizeDeceasedPerson } from './deceased-person-domain';

const fields: Array<[keyof DeceasedPerson, string, boolean]> = [['code', 'Mã số', true], ['fullName', 'Họ và tên', true], ['dharmaName', 'Pháp danh', false], ['dateOfDeath', 'Ngày mất', true], ['createdBy', 'Người đăng ký', true], ['householdReference', 'Mã hộ (nếu có)', false], ['familyReference', 'Mã gia đình (nếu có)', false]];
const empty = (): DeceasedPerson => ({ code: '', fullName: '', dharmaName: '', dateOfDeath: '', createdBy: '', householdReference: '', familyReference: '' });

export function DeceasedPersonForm({ codes, onAdd }: { codes: string[]; onAdd: (person: DeceasedPerson) => Promise<void> }) {
  const [value, setValue] = useState(empty); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); const person = normalizeDeceasedPerson(value); const missing = fields.find(([key, , required]) => required && !person[key]);
    if (missing) return setError(`${missing[1]} là bắt buộc.`); if (!/^\d{4}-\d{2}-\d{2}$/.test(person.dateOfDeath)) return setError('Ngày mất không hợp lệ.'); if ((person.householdReference && !/^\d{1,4}$/.test(person.householdReference)) || (person.familyReference && !/^\d{1,4}$/.test(person.familyReference))) return setError('Mã hộ và mã gia đình phải từ 1 đến 4 chữ số.'); if (!!person.householdReference !== !!person.familyReference) return setError('Mã hộ và mã gia đình phải nhập cùng nhau.'); if (codes.includes(person.code)) return setError('Mã số đã tồn tại.');
    setSaving(true); setError(''); try { await onAdd(person); setValue(empty()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu người đã mất.'); } finally { setSaving(false); } }
  return <form className="catalog-form" noValidate onSubmit={submit}><h2>Nhập một người</h2>{fields.map(([key, label, required]) => <label key={key}>{label}<input type={key === 'dateOfDeath' ? 'date' : 'text'} inputMode={key === 'householdReference' || key === 'familyReference' ? 'numeric' : undefined} value={value[key]} onChange={(event) => setValue({ ...value, [key]: event.target.value })} required={required} /></label>)}{error && <p role="alert" className="notice">{error}</p>}<button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Thêm vào danh mục'}</button></form>;
}
