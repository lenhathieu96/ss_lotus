import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardShell } from './dashboard-shell';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  subscribeToSession: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
  isLibraryAdmin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/households',
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('@features/auth/auth-repository', () => ({ authRepository: {
  getSession: mocks.getSession,
  subscribeToSession: mocks.subscribeToSession,
  signOut: mocks.signOut,
} }));
vi.mock('@features/library/library-repository', () => ({ isLibraryAdmin: mocks.isLibraryAdmin }));

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
    expect(mocks.push).toHaveBeenCalledWith('/login');
  });
});
