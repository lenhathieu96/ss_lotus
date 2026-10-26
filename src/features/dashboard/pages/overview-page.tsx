import { CalendarDays, HeartHandshake, House } from 'lucide-react';
import { Card } from '@components/ui/card';
import { PrayerHandsIcon } from '@components/prayer-hands-icon';

function Metric({ label, icon: Icon }: { label: string; icon: typeof House }) {
  return <Card className="metric"><Icon aria-hidden="true" /><p>{label}</p><strong>—</strong></Card>;
}

export default function OverviewPage() {
  return <section className="page"><h1 className="sr-only">Tổng quan</h1><div className="metric-grid"><Metric label="Hộ gia đình" icon={House} /><Metric label="Hồ sơ Cầu an" icon={PrayerHandsIcon} /><Metric label="Hồ sơ Cầu siêu" icon={HeartHandshake} /></div><Card className="empty-panel"><CalendarDays aria-hidden="true" /><h2>Chưa có dữ liệu hiển thị</h2><p>Hoàn tất kết nối Supabase để tải số liệu quản trị.</p></Card></section>;
}
