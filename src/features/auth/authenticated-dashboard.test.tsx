import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedDashboard } from './authenticated-dashboard';

let authStateChangeListener: ((event: unknown, session: unknown) => void) | undefined;

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  replace: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

describe('AuthenticatedDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeListener = undefined;
    mocks.onAuthStateChange.mockImplementation((listener) => {
      authStateChangeListener = listener as (event: unknown, session: unknown) => void;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
  });

  it('redirects to login without a Supabase session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra phiên đăng nhập…');
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });

  it('renders dashboard content with a Supabase session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-session' } } });

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects when the Supabase session ends after loading the dashboard', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-session' } } });

    render(<AuthenticatedDashboard><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    authStateChangeListener?.('SIGNED_OUT', null);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument();
  });
});
