import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchHouseholds } from '../household-repository';
import { HouseholdWorkspace } from './household-workspace';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../household-repository', async (importOriginal) => ({
  ...await importOriginal<typeof import('../household-repository')>(),
  searchHouseholds: vi.fn(),
}));

beforeEach(() => { vi.clearAllMocks(); });

describe('HouseholdWorkspace', () => {
  it('starts with search and hides creation fields until requested', async () => {
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);

    expect(screen.getByRole('heading', { name: 'Cầu An' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tìm kiếm' })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Địa chỉ gia đình' })).not.toBeInTheDocument();
    expect(screen.queryByText('Không tìm thấy hộ phù hợp')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Thêm hộ' }));
    expect(screen.getByRole('textbox', { name: 'Địa chỉ gia đình' })).toBeVisible();
  });

  it('asks for confirmation before discarding a household draft', async () => {
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);

    await user.click(screen.getByRole('button', { name: 'Thêm hộ' }));
    await user.type(screen.getByRole('textbox', { name: 'Địa chỉ gia đình' }), '12 Lê Lợi');
    await user.click(screen.getByRole('button', { name: 'Thêm gia đình' }));
    await user.click(screen.getByRole('button', { name: 'Đóng và bỏ bản nháp' }));

    expect(screen.getByRole('alertdialog', { name: 'Bỏ bản nháp' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: /^Bỏ bản nháp$/ }));
    expect(screen.getByRole('button', { name: 'Thêm hộ' })).toBeVisible();
  });

  it('shows real search results and opens the selected household', async () => {
    vi.mocked(searchHouseholds).mockResolvedValue([{ id: 'household-7', businessNumber: 7, addresses: ['12 Lê Lợi'], familyCount: 2, memberCount: 5, headMember: { id: 'member-1', fullName: 'NGUYỄN AN', dharmaName: 'TÂM AN' } }]);
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);
    await user.type(screen.getByRole('textbox', { name: /Mã hộ/ }), 'Nguyễn');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));

    expect(searchHouseholds).toHaveBeenCalledWith('Nguyễn');
    expect(await screen.findByText('NGUYỄN AN')).toBeVisible();
    expect(screen.getByText('2 gia đình · 5 thành viên')).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Mở hộ 7/ }));
    expect(push).toHaveBeenCalledWith('/households/household-7');
  });

  it('clears completed results when the search query changes', async () => {
    vi.mocked(searchHouseholds).mockResolvedValue([{ id: 'household-7', businessNumber: 7, addresses: ['12 Lê Lợi'], familyCount: 2, memberCount: 5, headMember: { id: 'member-1', fullName: 'NGUYỄN AN' } }]);
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);
    const query = screen.getByRole('textbox', { name: /Mã hộ/ });
    await user.type(query, 'Nguyễn');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(await screen.findByText('NGUYỄN AN')).toBeVisible();

    await user.type(query, ' An');

    expect(screen.queryByText('NGUYỄN AN')).not.toBeInTheDocument();
    expect(screen.getByText('Tìm hồ sơ hộ gia đình')).toBeVisible();
  });

  it('shows an empty result only after a completed search', async () => {
    vi.mocked(searchHouseholds).mockResolvedValue([]);
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);
    await user.type(screen.getByRole('textbox', { name: /Mã hộ/ }), 'không có');
    expect(screen.queryByText('Không tìm thấy hộ phù hợp')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(await screen.findByText('Không tìm thấy hộ phù hợp')).toBeVisible();
  });

  it('shows loading and provider failures without reporting an empty result', async () => {
    let rejectSearch!: (error: Error) => void;
    vi.mocked(searchHouseholds).mockImplementation(() => new Promise((_resolve, reject) => { rejectSearch = reject; }));
    const user = userEvent.setup();
    render(<HouseholdWorkspace />);
    await user.type(screen.getByRole('textbox', { name: /Mã hộ/ }), 'An');
    await user.click(screen.getByRole('button', { name: 'Tìm kiếm' }));
    expect(screen.getByRole('button', { name: 'Đang tìm…' })).toBeDisabled();
    rejectSearch(new Error('Mất kết nối dữ liệu.'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mất kết nối dữ liệu.');
    expect(screen.queryByText('Không tìm thấy hộ phù hợp')).not.toBeInTheDocument();
  });
});
