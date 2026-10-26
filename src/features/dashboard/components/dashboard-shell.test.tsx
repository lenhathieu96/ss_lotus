import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardShell } from './dashboard-shell';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  subscribeToSession: vi.fn(),
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  isLibraryAdmin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/households',
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock('@features/auth/auth-repository', () => ({ authRepository: {
  getSession: mocks.getSession,
  subscribeToSession: mocks.subscribeToSession,
  signOut: mocks.signOut,
} }));
vi.mock('@features/library/library-repository', () => ({ isLibraryAdmin: mocks.isLibraryAdmin }));
vi.mock('@features/pagodas/pagoda-access-context', () => ({ usePagodaAccess: () => ({ activePagoda: { name: 'Chùa Từ Ân' } }) }));
vi.mock('@features/auth/components/dashboard-access-context', () => ({ useDashboardAccess: () => ({ userId: 'admin-1', username: 'admin', isLibraryAdmin: false }) }));

describe('DashboardShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 'admin-1' });
    mocks.subscribeToSession.mockReturnValue(() => undefined);
    mocks.signOut.mockResolvedValue(undefined);
    mocks.isLibraryAdmin.mockResolvedValue(false);
  });

  it('uses the auth repository to sign out and return to login', async () => {
    const user = userEvent.setup();
    render(<DashboardShell><p>Dashboard content</p></DashboardShell>);

    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.replace).toHaveBeenCalledWith('/login');
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });


  it('shows the currently managed pagoda name without the lunar-year subtitle', () => {
    render(<DashboardShell><p>Dashboard content</p></DashboardShell>);

    expect(screen.getByText('Chùa Từ Ân')).toBeVisible();
    expect(screen.getByRole('button', { name: 'admin' })).toBeVisible();
    expect(screen.queryByText(/Năm lễ âm lịch/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chùa đang quản trị')).not.toBeInTheDocument();
  });

  it('keeps the primary sections available in the public library shell', () => {
    render(<DashboardShell publicLibrary><p>Library content</p></DashboardShell>);
    const primaryNavigation = within(screen.getByLabelText('Điều hướng chính'));

    expect(primaryNavigation.queryByRole('button', { name: 'Thu gọn điều hướng' })).not.toBeInTheDocument();
    expect(primaryNavigation.getByRole('link', { name: 'Tổng quan' })).toHaveAttribute('href', '/overview');
    expect(primaryNavigation.getByRole('link', { name: 'Cầu An' })).toHaveAttribute('href', '/households');
    expect(primaryNavigation.getByRole('link', { name: 'Thư viện' })).toHaveAttribute('href', '/thu-vien');
    expect(screen.getByLabelText('Điều hướng di động')).toHaveClass('has-five-items');
  });
});
