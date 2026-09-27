'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BookOpen, Flower2, Home, House, LogOut, Menu, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { fromSolarDate, getVietnamToday } from '../../features/calendar/lunar-date-domain';
import { Button } from '@/components/ui/button';
import { isLibraryAdmin } from '@/features/library/library-repository';

const navigation = [
  { to: '/overview', label: 'Tổng quan', icon: Home },
  { to: '/households', label: 'Hộ gia đình', icon: House },
  { to: '/huong-linh', label: 'Hương linh', icon: Flower2 },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
  { to: '/admin/thu-vien', label: 'Thư viện', icon: BookOpen },
];

function isCurrentRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryAdmin, setLibraryAdmin] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    async function refreshCapability() {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) {
        setLibraryAdmin(false);
        setAdminUserId('');
        return;
      }
      setAdminUserId(session.user.id);
      try { setLibraryAdmin(await isLibraryAdmin()); }
      catch { setLibraryAdmin(false); }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setLibraryAdmin(false);
        setAdminUserId('');
      } else {
        window.setTimeout(() => { if (active) void refreshCapability(); }, 0);
      }
    });
    void refreshCapability();
    return () => { active = false; subscription.unsubscribe(); };
  }, [adminUserId]);

  async function signOut() {
    await supabase?.auth.signOut();
    router.push('/login');
  }

  const lunarYear = fromSolarDate(getVietnamToday()).year;
  const visibleNavigation = libraryAdmin ? navigation : navigation.filter((item) => item.to !== '/admin/thu-vien');
  return <div className="app-shell"><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className={menuOpen ? 'sidebar open' : 'sidebar'} aria-label="Điều hướng chính"><div className="brand"><Flower2 aria-hidden="true" /><strong>SS Lotus</strong></div><p className="sidebar-caption">Quản trị chùa</p><nav>{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} className={isCurrentRoute(pathname, to) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav><Button className="logout" variant="ghost" type="button" onClick={() => void signOut()}><LogOut aria-hidden="true" /> Đăng xuất</Button></aside><div className="workspace"><header className="topbar"><Button className="menu-button" variant="secondary" size="icon" type="button" aria-label="Mở điều hướng" onClick={() => setMenuOpen((open) => !open)}><Menu /></Button><div><p>Chùa SS Lotus</p><strong>Năm lễ âm lịch {lunarYear}</strong></div><Button className="profile" variant="secondary" type="button" aria-label="Tài khoản admin"><Users aria-hidden="true" /> Admin</Button></header><main id="main-content">{children}</main></div><nav className={libraryAdmin ? 'bottom-nav has-library-admin' : 'bottom-nav'} aria-label="Điều hướng di động">{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} className={isCurrentRoute(pathname, to) ? 'active' : ''}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav></div>;
}
