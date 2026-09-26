import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const householdRepo = vi.hoisted(() => ({ getHouseholdWorkspace: vi.fn() }));
const prayerRepo = vi.hoisted(() => ({ createHouseholdWellbeingRegistration: vi.fn(), createMemorialRegistration: vi.fn() }));
vi.mock('./household-repository', () => householdRepo);
vi.mock('../prayer/prayer-repository', () => prayerRepo);

import { HouseholdDetailWorkspace } from './household-detail-workspace';

describe('HouseholdDetailWorkspace', () => {
  beforeEach(() => {
    householdRepo.getHouseholdWorkspace.mockResolvedValue({
      id: 'household-1', businessNumber: 12, families: [
        { id: 'family-1', businessNumber: 7, address: 'Địa chỉ A', members: [{ id: 'member-a', fullName: 'Thành viên A', prayerHistory: [] }], deceasedPeople: [{ id: 'deceased-a', code: 'HL-01', fullName: 'Hương linh A', dateOfDeath: { day: 1, month: 2, isLeap: true }, prayerHistory: [{ date: '2026-02-17', period: 'morning' }] }] },
        { id: 'family-2', businessNumber: 9, address: 'Địa chỉ B', members: [{ id: 'member-b', fullName: 'Thành viên B', prayerHistory: [] }], deceasedPeople: [] },
      ],
    });
    prayerRepo.createHouseholdWellbeingRegistration.mockResolvedValue(undefined);
    prayerRepo.createMemorialRegistration.mockResolvedValue(undefined);
  });

  it('submits one shared Cầu an registration across selected family addresses', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Hộ #12' });
    expect(screen.getByText('Ngày mất: 01/02 ÂL (nhuận)')).toBeInTheDocument();
    expect(screen.getByText(/01\/01\/2026 ÂL · Sáng/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Thành viên A/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Thành viên B/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký Cầu an (2)' }));
    expect(screen.getByRole('radio', { name: 'Sáng' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Chiều' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đăng ký' }));
    await waitFor(() => expect(prayerRepo.createHouseholdWellbeingRegistration).toHaveBeenCalledWith('household-1', ['member-a', 'member-b'], expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 'afternoon'));
  });
});
