'use client';

import { ReactNode, useEffect, useState } from 'react';
import { BookOpen, HeartHandshake, Home, LogIn, LogOut, Menu, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@components/ui/button';
import { BrandLogo } from '@components/brand-logo';
import { PrayerHandsIcon } from '@components/prayer-hands-icon';
import { isLibraryAdmin } from '@features/library/library-repository';
import { authRepository } from '@features/auth/auth-repository';
import { usePagodaAccess } from '@features/pagodas/pagoda-access-context';
import { clearActivePagodaId, removeStoredActivePagodaId } from '@features/pagodas/pagoda-client';
import { useDashboardAccess } from '@features/auth/components/dashboard-access-context';

const navigation = [
  { to: '/overview', label: 'Tổng quan', icon: Home },
  { to: '/households', label: 'Cầu An', icon: PrayerHandsIcon },
  { to: '/huong-linh', label: 'Hương linh', icon: HeartHandshake },
  { to: '/admin/thu-vien', label: 'Thư viện', icon: BookOpen },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
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
    ? navigation.map((item) => item.to === '/admin/thu-vien' ? { ...item, to: '/thu-vien' } : item)
    : libraryAdmin ? navigation : navigation.filter((item) => item.to !== '/admin/thu-vien');
  const sidebarClassName = `sidebar${menuOpen ? ' open' : ''}`;
  const mobileNavigationClassName = visibleNavigation.length > 4 ? 'bottom-nav has-five-items' : 'bottom-nav';
  return <div className="app-shell"><a className="skip-link" href="#main-content">Đến nội dung chính</a><aside className={sidebarClassName} aria-label="Điều hướng chính"><div className="sidebar-top"><div className="brand"><BrandLogo /><strong>SS Lotus</strong></div></div><p className="sidebar-caption">{publicLibrary ? 'Thư viện Phật học' : 'Quản trị chùa'}</p><nav>{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} aria-label={label} className={isCurrentRoute(pathname, to) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav>{publicLibrary ? <Button asChild className="logout" variant="ghost"><Link href="/login" aria-label="Đăng nhập"><LogIn aria-hidden="true" /> <span>Đăng nhập</span></Link></Button> : <Button className="logout" variant="ghost" type="button" onClick={() => void signOut()} aria-label="Đăng xuất"><LogOut aria-hidden="true" /> <span>Đăng xuất</span></Button>}</aside><div className="workspace"><header className="topbar"><Button className="menu-button" variant="secondary" size="icon" type="button" aria-label="Mở điều hướng" onClick={() => setMenuOpen((open) => !open)}><Menu /></Button>{publicLibrary && <BrandLogo size={36} className="topbar-brand-logo" />}<div>{publicLibrary ? <><p>SS Lotus</p><strong>Thư viện Phật học</strong></> : <ManagedPagodaHeading />}</div>{publicLibrary ? <Button asChild className="profile" variant="secondary"><Link href="/login"><LogIn aria-hidden="true" /> Đăng nhập</Link></Button> : <Button className="profile" variant="secondary" type="button" aria-label={dashboardAccess?.username ?? 'Tài khoản'}><Users aria-hidden="true" /> {dashboardAccess?.username ?? 'Tài khoản'}</Button>}</header><main id="main-content">{children}</main></div><nav className={mobileNavigationClassName} aria-label="Điều hướng di động">{visibleNavigation.map(({ to, label, icon: Icon }) => <Link key={to} href={to} className={isCurrentRoute(pathname, to) ? 'active' : ''}><Icon aria-hidden="true" /><span>{label}</span></Link>)}</nav></div>;
}
