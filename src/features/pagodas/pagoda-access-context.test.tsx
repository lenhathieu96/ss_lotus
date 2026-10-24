import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMyPagodas: vi.fn(),
  removeStoredActivePagodaId: vi.fn(),
  setActivePagodaId: vi.fn(),
  setActivePagodaMemory: vi.fn(),
  storedActivePagodaId: vi.fn(),
  replace: vi.fn(),
  router: null as unknown as { replace: ReturnType<typeof vi.fn> },
}));

mocks.router = { replace: mocks.replace };

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('./pagoda-client', () => ({
  activePagodaStorageKey: (userId: string) => `ss-lotus.active-pagoda-id.${userId}`,
  clearActivePagodaId: vi.fn(),
  listMyPagodas: mocks.listMyPagodas,
  removeStoredActivePagodaId: mocks.removeStoredActivePagodaId,
  setActivePagodaId: mocks.setActivePagodaId,
  setActivePagodaMemory: mocks.setActivePagodaMemory,
  storedActivePagodaId: mocks.storedActivePagodaId,
}));

import { PagodaAccessProvider, usePagodaAccess } from './pagoda-access-context';
import { PagodaSwitcher } from './pagoda-switcher';

const pagodas = [
  { id: 'pagoda-a', slug: 'an-lac', name: 'Chùa An Lạc' },
  { id: 'pagoda-b', slug: 'tu-an', name: 'Chùa Từ Ân' },
];

function ActivePagodaProbe() {
  const { activePagoda } = usePagodaAccess();
  return <p>Đang dùng {activePagoda.name}</p>;
}

describe('PagodaAccessProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storedActivePagodaId.mockReturnValue(null);
    mocks.listMyPagodas.mockResolvedValue(pagodas);
  });

  it('loads and validates an authorized pagoda before mounting dashboard children', async () => {
    let resolvePagodas: (value: typeof pagodas) => void = () => undefined;
    mocks.listMyPagodas.mockReturnValue(new Promise((resolve) => { resolvePagodas = resolve; }));

    render(<PagodaAccessProvider userId="user-a"><ActivePagodaProbe /></PagodaAccessProvider>);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải quyền truy cập chùa…');
    expect(screen.queryByText('Đang dùng Chùa An Lạc')).not.toBeInTheDocument();
    resolvePagodas(pagodas);

    expect(await screen.findByText('Đang dùng Chùa An Lạc')).toBeVisible();
    expect(mocks.setActivePagodaMemory).toHaveBeenCalledWith('user-a', 'pagoda-a');
    expect(mocks.setActivePagodaId).toHaveBeenCalledWith('user-a', 'pagoda-a');
  });

  it('rejects stale user storage and chooses the first authorized pagoda', async () => {
    mocks.storedActivePagodaId.mockReturnValue('revoked-pagoda');

    render(<PagodaAccessProvider userId="user-a"><ActivePagodaProbe /></PagodaAccessProvider>);

    expect(await screen.findByText('Đang dùng Chùa An Lạc')).toBeVisible();
    expect(mocks.setActivePagodaId).toHaveBeenCalledWith('user-a', 'pagoda-a');
  });

  it('shows an actionable retry error without mounting dashboard children', async () => {
    const user = userEvent.setup();
    mocks.listMyPagodas.mockRejectedValueOnce(new Error('Mạng không ổn định')).mockResolvedValueOnce(pagodas);

    render(<PagodaAccessProvider userId="user-a"><ActivePagodaProbe /></PagodaAccessProvider>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Mạng không ổn định');
    expect(screen.queryByText('Đang dùng Chùa An Lạc')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Đang dùng Chùa An Lạc')).toBeVisible();
  });

  it('blocks feature children when the user has no authorized pagodas', async () => {
    mocks.listMyPagodas.mockResolvedValue([]);

    render(<PagodaAccessProvider userId="user-a"><ActivePagodaProbe /></PagodaAccessProvider>);

    expect(await screen.findByText('Tài khoản này chưa được cấp quyền vào chùa nào.')).toBeVisible();
    expect(screen.queryByText(/Đang dùng/)).not.toBeInTheDocument();
    expect(mocks.removeStoredActivePagodaId).toHaveBeenCalledWith('user-a');
  });

  it('switches tenants only through the authorized list and returns to the overview', async () => {
    const user = userEvent.setup();
    render(<PagodaAccessProvider userId="user-a"><PagodaSwitcher /></PagodaAccessProvider>);

    await screen.findByRole('combobox', { name: 'Chùa đang quản trị' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Chùa đang quản trị' }), 'pagoda-b');

    expect(mocks.setActivePagodaId).toHaveBeenLastCalledWith('user-a', 'pagoda-b');
    expect(mocks.replace).toHaveBeenCalledWith('/overview');
  });

  it('revalidates storage changes against the server before adopting them', async () => {
    mocks.storedActivePagodaId.mockReturnValueOnce(null).mockReturnValue('pagoda-b');
    render(<PagodaAccessProvider userId="user-a"><ActivePagodaProbe /></PagodaAccessProvider>);

    await screen.findByText('Đang dùng Chùa An Lạc');
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ss-lotus.active-pagoda-id.user-a',
      newValue: 'pagoda-b',
      storageArea: window.localStorage,
    }));

    await waitFor(() => expect(screen.getByText('Đang dùng Chùa Từ Ân')).toBeVisible());
    expect(mocks.listMyPagodas).toHaveBeenCalledTimes(2);
    expect(mocks.replace).toHaveBeenCalledWith('/overview');
  });
});
