import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedDashboard } from './authenticated-dashboard';

let authStateChangeListener: ((session: unknown) => void) | undefined;

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    replace,
    router: { replace },
    unsubscribe: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@features/pagodas/pagoda-access-context', () => ({
  PagodaAccessProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('../auth-repository', () => ({
  authRepository: {
    getSession: mocks.getSession,
    subscribeToSession: mocks.onAuthStateChange,
  },
}));

describe('AuthenticatedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeListener = undefined;
    mocks.onAuthStateChange.mockImplementation((listener) => {
      authStateChangeListener = listener as (session: unknown) => void;
      return mocks.unsubscribe;
    });
  });

  it('redirects to login without a Supabase session', async () => {
    mocks.getSession.mockResolvedValue(null);

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra phiên đăng nhập…');
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });

  it('renders dashboard content with a Supabase session', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'test-user' });

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects when the Supabase session ends after loading the dashboard', async () => {
    mocks.getSession.mockResolvedValue({ userId: 'test-user' });

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    await act(async () => authStateChangeListener?.(null));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    await waitFor(() => expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument());
  });
});
