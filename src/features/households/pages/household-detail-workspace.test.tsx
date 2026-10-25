import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const householdRepo = vi.hoisted(() => ({ getHouseholdWorkspace: vi.fn(), saveHouseholdWorkspace: vi.fn() }));
const prayerRepo = vi.hoisted(() => ({ bookHouseholdWellbeingSlot: vi.fn(), createMemorialRegistration: vi.fn() }));
vi.mock('../household-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('../household-repository')>(), ...householdRepo }));
vi.mock('@features/prayer/prayer-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('@features/prayer/prayer-repository')>(), ...prayerRepo }));

import { HouseholdDetailWorkspace } from './household-detail-workspace';

describe('HouseholdDetailWorkspace', () => {
  beforeEach(() => {
    householdRepo.getHouseholdWorkspace.mockResolvedValue({
      id: 'household-1', businessNumber: 12, revision: 4, headMember: { id: 'member-a', fullName: 'THÀNH VIÊN A' }, wellbeingBooking: null,
      families: [{ id: 'family-1', businessNumber: 7, address: 'Địa chỉ A', members: [{ id: 'member-a', fullName: 'THÀNH VIÊN A', prayerHistory: [] }], deceasedPeople: [] }],
    });
  });

  it('shows the derived household head and enables one full-household booking action after canonical load', async () => {
    render(<HouseholdDetailWorkspace householdId="household-1" />);
    await screen.findByRole('heading', { name: 'Chủ hộ: THÀNH VIÊN A' });
    expect(screen.getByText('Chưa có lịch Cầu An')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đặt lịch Cầu An' })).toBeEnabled();
  });
});
