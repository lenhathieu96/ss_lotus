'use client';

import { useState } from 'react';
import { CalendarDays, Flower2 } from 'lucide-react';
import Link from 'next/link';
import { allowedPeriods, CeremonyPeriod, isFutureOrToday, PrayerType } from '../households/household-domain';

export function PrayerPage({ type }: { type: PrayerType }) {
  const title = type === 'wellbeing' ? 'Cầu an' : 'Cầu siêu';
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState<CeremonyPeriod>(allowedPeriods(type)[0]);
  const validDate = !date || isFutureOrToday(new Date(`${date}T00:00:00`));
  return <section className="page feature-page"><CalendarDays aria-hidden="true" /><p className="eyebrow">HỒ SƠ {title.toUpperCase()}</p><h1>{title}</h1><p>{type === 'wellbeing' ? 'Chọn thành viên còn sống của gia đình và thời khóa phù hợp.' : 'Lập hồ sơ người đã mất với thành viên gia đình làm người đại diện.'}</p>{type === 'memorial' && <Link className="catalog-link" href="/memorial-prayer/deceased-persons">Mở danh sách người đã mất</Link>}<form className="schedule-form"><label>Ngày lễ<input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /></label><fieldset><legend>Thời khóa</legend>{allowedPeriods(type).map((value) => <label key={value}><input type="radio" name="period" checked={period === value} onChange={() => setPeriod(value)} />{({ morning: 'Sáng', afternoon: 'Chiều', evening: 'Tối' })[value]}</label>)}</fieldset>{!validDate && <p className="notice" role="alert">Chỉ có thể chọn ngày hôm nay hoặc tương lai.</p>}<p className="capacity-label">Sức chứa: — / 150 hộ. Supabase sẽ cung cấp số chỗ còn lại theo ngày và thời khóa.</p><button disabled={!date || !validDate}>Lưu lịch đăng ký</button></form></section>;
}
