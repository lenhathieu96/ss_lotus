import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const householdRepo = vi.hoisted(() => ({ getHouseholdWorkspace: vi.fn(), saveHouseholdWorkspace: vi.fn() }));
const prayerRepo = vi.hoisted(() => ({ bookHouseholdWellbeingSlot: vi.fn(), createMemorialRegistration: vi.fn() }));
vi.mock('../household-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('../household-repository')>(), ...householdRepo }));
vi.mock('@features/prayer/prayer-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('@features/prayer/prayer-repository')>(), ...prayerRepo }));

import { HouseholdDetailWorkspace } from './household-detail-workspace';

describe('HouseholdDetailWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    householdRepo.getHouseholdWorkspace.mockResolvedValue({
      id: 'household-1', businessNumber: 12, revision: 4, headMember: { id: 'member-a', fullName: 'THÀNH VIÊN A' }, wellbeingBooking: null,
      families: [{ id: 'family-1', businessNumber: 7, address: 'Địa chỉ A', members: [{ id: 'member-a', fullName: 'THÀNH VIÊN A', prayerHistory: [] }, { id: 'member-b', fullName: 'THÀNH VIÊN B', yearOfBirth: 1980, dharmaName: 'TỊNH TÂM' }], deceasedPeople: [] }],
    });
  });

  it('shows the derived household head and enables one full-household booking action after canonical load', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    expect(screen.getByText('Chưa có lịch Cầu An')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đặt lịch Cầu An' })).toBeEnabled();
  });

  it('opens contextual add-family form only from the dock and gates booking after edits', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    expect(screen.queryByLabelText('Địa chỉ gia đình mới')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm gia đình' }));
    const dialog = screen.getByRole('dialog', { name: 'Thêm gia đình' });
    fireEvent.change(within(dialog).getByLabelText('Địa chỉ gia đình mới'), { target: { value: 'Địa chỉ B' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ĐỊA CHỈ B' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đặt lịch Cầu An' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
    expect(screen.getByText('Gia đình đang trống. Kéo người vào hoặc dùng Chuyển đến.')).toBeVisible();
  });

  it('supports member selection and select-all without silently splitting multiple people', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    expect(screen.getByText('Pháp danh: Chưa có')).toBeVisible();
    expect(screen.getByText('Năm sinh: 1980')).toBeVisible();
    const split = screen.getByRole('button', { name: 'Tách' });
    expect(split).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn THÀNH VIÊN A' }));
    expect(split).toBeEnabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả thành viên Địa chỉ A' }));
    expect(screen.getByText('Đã chọn 2 thành viên')).toBeVisible();
    expect(split).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Chuyển' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }));
    expect(screen.getByRole('checkbox', { name: 'Chọn THÀNH VIÊN A' })).not.toBeChecked();
  });

  it('splits the one selected member through the real reducer', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn THÀNH VIÊN B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tách' }));
    const dialog = screen.getByRole('dialog', { name: 'Tách gia đình' });
    expect(within(dialog).getByText('THÀNH VIÊN B')).toBeVisible();
    fireEvent.change(within(dialog).getByLabelText('Địa chỉ gia đình mới'), { target: { value: 'Địa chỉ mới' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    expect(screen.getByRole('heading', { name: 'ĐỊA CHỈ MỚI' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  });

  it('disables every dock operation and selection while saving', async () => {
    householdRepo.saveHouseholdWorkspace.mockReturnValue(new Promise(() => {}));
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn THÀNH VIÊN B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu trữ' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const dock = screen.getByRole('contentinfo', { name: 'Thao tác hộ gia đình' });
    for (const button of within(dock).getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Chọn THÀNH VIÊN A' })).toBeDisabled();
  });


  it('moves all selected members into an empty target family', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm gia đình' }));
    fireEvent.change(screen.getByLabelText('Địa chỉ gia đình mới'), { target: { value: 'Địa chỉ B' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả thành viên Địa chỉ A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển' }));
    const dialog = screen.getByRole('dialog', { name: 'Chuyển thành viên' });
    fireEvent.change(within(dialog).getByLabelText('Gia đình nhận thành viên'), { target: { value: 'family-2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    const target = screen.getByRole('article', { name: 'ĐỊA CHỈ B' });
    expect(within(target).getByText('THÀNH VIÊN A')).toBeVisible();
    expect(within(target).getByText('THÀNH VIÊN B')).toBeVisible();
    expect(within(screen.getByRole('article', { name: 'Địa chỉ A' })).queryByRole('checkbox', { name: 'Chọn THÀNH VIÊN A' })).not.toBeInTheDocument();
  });

});
