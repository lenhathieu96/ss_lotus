import { CalendarDays, Flower2, HeartHandshake, House } from 'lucide-react';

function Metric({ label, icon: Icon }: { label: string; icon: typeof House }) {
  return <article className="metric"><Icon aria-hidden="true" /><p>{label}</p><strong>—</strong></article>;
}

export default function OverviewPage() {
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">TỔNG QUAN</p><h1>Không gian quản trị lễ</h1><p>Quản lý hộ gia đình, Cầu an và Cầu siêu trong một nơi.</p></div></div><div className="metric-grid"><Metric label="Hộ gia đình" icon={House} /><Metric label="Hồ sơ Cầu an" icon={HeartHandshake} /><Metric label="Hồ sơ Cầu siêu" icon={Flower2} /></div><section className="empty-panel"><CalendarDays aria-hidden="true" /><h2>Chưa có dữ liệu hiển thị</h2><p>Hoàn tất kết nối Supabase để tải số liệu quản trị.</p></section></section>;
}
