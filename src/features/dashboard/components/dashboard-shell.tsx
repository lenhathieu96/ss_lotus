'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BookOpen, ChevronLeft, Flower2, Home, House, LogIn, LogOut, Menu, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { isLibraryAdmin } from '@features/library/library-repository';
import { authRepository } from '@features/auth/auth-repository';
import { usePagodaAccess } from '@features/pagodas/pagoda-access-context';
import { clearActivePagodaId, removeStoredActivePagodaId } from '@features/pagodas/pagoda-client';
import { useDashboardAccess } from '@features/auth/components/dashboard-access-context';

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

function ManagedPagodaHeading() {
  const { activePagoda } = usePagodaAccess();

  return <h1 className="managed-pagoda-title">{activePagoda.name}</h1>;
}

export function DashboardShell({ children, publicLibrary = false }: { children: ReactNode; publicLibrary?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [libraryAdmin, setLibraryAdmin] = useState(false);
  const dashboardAccess = useDashboardAccess();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (publicLibrary) return;
    let active = true;
    let retryTimer: number | null = null;
    async function refreshCapability() {
      try {
        const allowed = await isLibraryAdmin();
        if (active) setLibraryAdmin(allowed);
      } catch {
        // A transient provider error preserves the last server-confirmed menu.
      }
    }
    setLibraryAdmin(dashboardAccess?.isLibraryAdmin ?? false);
    const unsubscribe = authRepository.subscribeToSession((session) => {
      if (!session) {
        setLibraryAdmin(false);
      } else {
        window.setTimeout(() => { if (active) void refreshCapability(); }, 0);
      }
    });
    const revalidate = () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => { void refreshCapability(); }, 150);
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') revalidate(); };
    const onRevoked = () => { if (active) setLibraryAdmin(false); };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('ss-lotus:library-admin-revoked', onRevoked);
    return () => {
      active = false;
      unsubscribe();
      if (retryTimer) window.clearTimeout(retryTimer);
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('ss-lotus:library-admin-revoked', onRevoked);
    };
  }, [dashboardAccess?.isLibraryAdmin, publicLibrary]);

  async function signOut() {
    await authRepository.signOut();
    if (dashboardAccess) removeStoredActivePagodaId(dashboardAccess.userId);
    clearActivePagodaId(dashboardAccess?.userId);
    setLibraryAdmin(false);
    router.replace('/login');
    router.refresh();
  }

  const visibleNavigation = publicLibrary
    ? [...navigation.slice(0, -1), { to: '/thu-vien', label: 'Thư viện', icon: BookOpen }]
    : libraryAdmin ? navigation : navigation.filter((item) => item.to !== '/admin/thu-vien');
  const sidebarClassName = `sidebar${menuOpen ? ' open' : ''}${sidebarCollapsed ? ' collapsed' : ''}`;
  const mobileNavigationClassName = visibleNavigation.length > 4 ? 'bottom-nav has-five-items' : 'bottom-nav';
  return <div className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className={sidebarClassName} aria-label="Điều hướng chính"><div className="sidebar-top"><div className="brand"><Flower2 aria-hidden="true" /><strong>SS Lotus</strong></div><Button className="sidebar-collapse-toggle" variant="ghost" size="icon-sm" type="button" aria-label={sidebarCollapsed ? 'Mở rộng điều hướng' : 'Thu gọn điều hướng'} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? <Flower2 aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}</Button></div><p className="sidebar-caption">{publicLibrary ? 'Thư viện Phật học' : 'Quản trị chùa'}</p><nav>{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} aria-label={label} title={sidebarCollapsed ? label : undefined} className={isCurrentRoute(pathname, to) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav>{publicLibrary ? <Button asChild className="logout" variant="ghost"><Link href="/login" aria-label="Đăng nhập" title={sidebarCollapsed ? 'Đăng nhập' : undefined}><LogIn aria-hidden="true" /> <span>Đăng nhập</span></Link></Button> : <Button className="logout" variant="ghost" type="button" onClick={() => void signOut()} aria-label="Đăng xuất" title={sidebarCollapsed ? 'Đăng xuất' : undefined}><LogOut aria-hidden="true" /> <span>Đăng xuất</span></Button>}</aside><div className="workspace"><header className="topbar"><Button className="menu-button" variant="secondary" size="icon" type="button" aria-label="Mở điều hướng" onClick={() => setMenuOpen((open) => !open)}><Menu /></Button><div>{publicLibrary ? <><p>SS Lotus</p><strong>Thư viện Phật học</strong></> : <ManagedPagodaHeading />}</div>{publicLibrary ? <Button asChild className="profile" variant="secondary"><Link href="/login"><LogIn aria-hidden="true" /> Đăng nhập</Link></Button> : <Button className="profile" variant="secondary" type="button" aria-label={dashboardAccess?.username ?? 'Tài khoản'}><Users aria-hidden="true" /> {dashboardAccess?.username ?? 'Tài khoản'}</Button>}</header><main id="main-content">{children}</main></div><nav className={mobileNavigationClassName} aria-label="Điều hướng di động">{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} className={isCurrentRoute(pathname, to) ? 'active' : ''}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav></div>;
}
