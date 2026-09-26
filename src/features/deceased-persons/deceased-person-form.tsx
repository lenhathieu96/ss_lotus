import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  normalizeDeceasedPerson,
  type DeceasedPerson,
} from "./deceased-person-domain";
import { isValidLunarDayMonth } from '../calendar/lunar-date-domain';
import { LunarDayMonthPicker } from '../calendar/lunar-day-month-picker';

type FormField = Exclude<keyof DeceasedPerson, "id" | "prayerHistory" | "dateOfDeath">;

const fields: Array<[FormField, string, boolean]> = [
  ["code", "Mã số", true],
  ["fullName", "Họ và tên", true],
  ["dharmaName", "Pháp danh", false],
  ["createdBy", "Người đăng ký", true],
  ["householdReference", "Mã hộ (nếu có)", false],
  ["familyReference", "Mã gia đình (nếu có)", false],
];

const empty = (): DeceasedPerson => ({
  code: "", fullName: "", dharmaName: "", dateOfDeath: { day: 0, month: 0, isLeap: false }, createdBy: "", householdReference: "", familyReference: "",
});

export function DeceasedPersonForm({ codes, onAdd, onClose, focusReturnTarget }: { codes: string[]; onAdd: (person: DeceasedPerson) => Promise<void>; onClose: () => void; focusReturnTarget: () => HTMLElement | null; }) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const focusReturnTargetRef = useRef(focusReturnTarget);
  focusReturnTargetRef.current = focusReturnTarget;
  const [value, setValue] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => () => { window.setTimeout(() => { focusReturnTargetRef.current()?.focus(); }); }, []);

  function closeDrawer() { if (!saving) onClose(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const person = normalizeDeceasedPerson(value);
    const missing = fields.find(([key, , required]) => required && !person[key]);
    if (missing) return setError(`${missing[1]} là bắt buộc.`);
    if (!isValidLunarDayMonth(person.dateOfDeath)) return setError("Ngày mất âm lịch là bắt buộc.");
    if ((person.householdReference && !/^\d{1,4}$/.test(person.householdReference)) || (person.familyReference && !/^\d{1,4}$/.test(person.familyReference))) return setError("Mã hộ và mã gia đình phải từ 1 đến 4 chữ số.");
    if (!!person.householdReference !== !!person.familyReference) return setError("Mã hộ và mã gia đình phải nhập cùng nhau.");
    if (codes.includes(person.code)) return setError("Mã số đã tồn tại.");
    setSaving(true); setError("");
    try { await onAdd(person); setValue(empty()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu người đã mất."); }
    finally { setSaving(false); }
  }

  return <Sheet open onOpenChange={(open) => { if (!open) closeDrawer(); }}><SheetContent className="catalog-create-drawer" showCloseButton={false} onOpenAutoFocus={(event) => { event.preventDefault(); firstInputRef.current?.focus(); }}><form className="catalog-form" noValidate onSubmit={submit}><SheetHeader><div><p className="eyebrow">HỒ SƠ HƯƠNG LINH</p><SheetTitle>Thêm hương linh</SheetTitle></div><Button type="button" variant="ghost" size="icon" className="icon-button" aria-label="Đóng thêm hương linh" disabled={saving} onClick={closeDrawer}>×</Button></SheetHeader><div className="catalog-form-fields">{fields.slice(0, 3).map(([key, label, required]) => <Label className="form-field" key={key}>{label}<Input ref={key === "code" ? firstInputRef : undefined} type="text" value={value[key]} onChange={(event) => setValue({ ...value, [key]: event.target.value })} required={required} /></Label>)}<LunarDayMonthPicker label="Ngày mất (âm lịch)" value={value.dateOfDeath} required onChange={(dateOfDeath) => setValue({ ...value, dateOfDeath })} />{fields.slice(3).map(([key, label, required]) => <Label className="form-field" key={key}>{label}<Input type="text" inputMode={key === "householdReference" || key === "familyReference" ? "numeric" : undefined} value={value[key]} onChange={(event) => setValue({ ...value, [key]: event.target.value })} required={required} /></Label>)}</div>{error && <p role="alert" className="notice">{error}</p>}<SheetFooter><Button type="button" variant="catalog" disabled={saving} onClick={closeDrawer}>Hủy</Button><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Thêm vào danh mục"}</Button></SheetFooter></form></SheetContent></Sheet>;
}
