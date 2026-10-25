'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, Flower2, Home, House, LogIn, LogOut, Menu, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fromSolarDate, getVietnamToday } from '@features/calendar/lunar-date-domain';
import { Button } from '@components/ui/button';
import { isLibraryAdmin } from '@features/library/library-repository';
import { authRepository } from '@features/auth/auth-repository';
import { PagodaSwitcher } from '@features/pagodas/pagoda-switcher';
import { clearActivePagodaId } from '@features/pagodas/pagoda-client';

const navigation = [
  { to: '/overview', label: 'Tổng quan', icon: Home },
  { to: '/households', label: 'Cầu An', icon: House },
  { to: '/huong-linh', label: 'Hương linh', icon: Flower2 },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
  { to: '/admin/thu-vien', label: 'Thư viện', icon: BookOpen },
];

function isCurrentRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function DashboardShell({ children, publicLibrary = false }: { children: ReactNode; publicLibrary?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [libraryAdmin, setLibraryAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (publicLibrary) return;
    let active = true;
    async function refreshCapability() {
      const session = await authRepository.getSession();
      if (!session) {
        setLibraryAdmin(false);
        return;
      }
      try { setLibraryAdmin(await isLibraryAdmin()); }
      catch { setLibraryAdmin(false); }
    }
    const unsubscribe = authRepository.subscribeToSession((session) => {
      if (!session) {
        setLibraryAdmin(false);
      } else {
        window.setTimeout(() => { if (active) void refreshCapability(); }, 0);
      }
    });
    void refreshCapability();
    return () => { active = false; unsubscribe(); };
  }, [publicLibrary]);

  async function signOut() {
    clearActivePagodaId();
    await authRepository.signOut();
    router.push('/login');
  }

  const lunarYear = fromSolarDate(getVietnamToday()).year;
  const visibleNavigation = publicLibrary
    ? [...navigation.slice(0, -1), { to: '/thu-vien', label: 'Thư viện', icon: BookOpen }]
    : libraryAdmin ? navigation : navigation.filter((item) => item.to !== '/admin/thu-vien');
  const sidebarClassName = `sidebar${menuOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`;
  const mobileNavigationClassName = visibleNavigation.length > 4 ? 'bottom-nav has-five-items' : 'bottom-nav';
  return <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className={sidebarClassName} aria-label="Điều hướng chính"><div className="sidebar-top"><div className="brand"><Flower2 aria-hidden="true" /><strong>SS Lotus</strong></div><Button className="sidebar-collapse-toggle" variant="ghost" size="icon-sm" type="button" aria-label={sidebarCollapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? <Flower2 aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}</Button></div><p className="sidebar-caption">{publicLibrary ? 'Thư viện Phật học' : 'Quản trị chùa'}</p><nav>{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} aria-label={label} title={sidebarCollapsed ? label : undefined} className={isCurrentRoute(pathname, to) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav>{publicLibrary ? <Button asChild className="logout" variant="ghost"><Link href="/login" aria-label="Đăng nhập" title={sidebarCollapsed ? 'Đăng nhập' : undefined}><LogIn aria-hidden="true" /> <span>Đăng nhập</span></Link></Button> : <Button className="logout" variant="ghost" type="button" onClick={() => void signOut()} aria-label="Đăng xuất" title={sidebarCollapsed ? 'Đăng xuất' : undefined}><LogOut aria-hidden="true" /> <span>Đăng xuất</span></Button>}</aside><div className="workspace"><header className="topbar"><Button className="menu-button" variant="secondary" size="icon" type="button" aria-label="Mở điều hướng" onClick={() => setMenuOpen((open) => !open)}><Menu /></Button><div><p>{publicLibrary ? 'SS Lotus' : 'Chùa SS Lotus'}</p><strong>{publicLibrary ? 'Thư viện Phật học' : `Năm lễ âm lịch ${lunarYear}`}</strong></div>{publicLibrary ? <Button asChild className="profile" variant="secondary"><Link href="/login"><LogIn aria-hidden="true" /> Đăng nhập</Link></Button> : <><PagodaSwitcher /><Button className="profile" variant="secondary" type="button" aria-label="Tài khoản"><Users aria-hidden="true" /> Tài khoản</Button></>}</header><main id="main-content">{children}</main></div><nav className={mobileNavigationClassName} aria-label="Điều hướng di động">{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} className={isCurrentRoute(pathname, to) ? 'active' : ''}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav></div>;
}
