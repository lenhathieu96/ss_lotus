import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticatedDashboard } from './authenticated-dashboard';

let authStateChangeListener: ((session: unknown) => void) | undefined;

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  const refresh = vi.fn();
  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    replace,
    refresh,
    router: { replace, refresh },
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
  const initialBootstrap = {
    kind: 'ready' as const,
    userId: 'test-user',
    pagodas: [{ id: 'pagoda-1', slug: 'test', name: 'Test Pagoda' }],
    activePagoda: { id: 'pagoda-1', slug: 'test', name: 'Test Pagoda' },
    isLibraryAdmin: false,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeListener = undefined;
    mocks.onAuthStateChange.mockImplementation((listener) => {
      authStateChangeListener = listener as (session: unknown) => void;
      return mocks.unsubscribe;
    });
  });

  it('renders from the server bootstrap without a client startup session request', async () => {
    render(<AuthenticatedDashboard initialBootstrap={initialBootstrap}><p>Protected dashboard</p></AuthenticatedDashboard>);
    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it('renders dashboard content with a Supabase session', async () => {
    render(<AuthenticatedDashboard initialBootstrap={initialBootstrap}><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('redirects when the Supabase session ends after loading the dashboard', async () => {
    render(<AuthenticatedDashboard initialBootstrap={initialBootstrap}><p>Protected dashboard</p></AuthenticatedDashboard>);

    expect(await screen.findByText('Protected dashboard')).toBeVisible();
    await act(async () => authStateChangeListener?.(null));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
    expect(mocks.refresh).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText('Protected dashboard')).not.toBeInTheDocument());
  });
});
