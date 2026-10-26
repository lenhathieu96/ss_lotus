import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

const prayerRepo = vi.hoisted(() => ({ getWellbeingSeasonAvailability: vi.fn() }));
vi.mock('@features/prayer/prayer-repository', async (importOriginal) => ({ ...await importOriginal<typeof import('@features/prayer/prayer-repository')>(), ...prayerRepo }));
import { WellbeingBookingDialog } from './wellbeing-booking-dialog';

describe('WellbeingBookingDialog', () => {
  beforeEach(() => prayerRepo.getWellbeingSeasonAvailability.mockResolvedValue({ lunarYear: 2027, slots: [
    { id: '2027:2027-02-06:morning', solarDate: '2027-02-06', lunarDay: 1, period: 'morning', capacity: 200, used: 200, remaining: 0, isPast: false },
    { id: '2027:2027-02-06:afternoon', solarDate: '2027-02-06', lunarDay: 1, period: 'afternoon', capacity: 200, used: 4, remaining: 196, isPast: false },
  ] }));

  it('keeps the current full slot selectable while disabling another full slot', async () => {
    render(<WellbeingBookingDialog booking={{ slotId: '2027:2027-02-06:morning', solarDate: '2027-02-06', period: 'morning', lunarYear: 2027 }} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const morning = await screen.findByRole('button', { name: /Sáng/ });
    expect(morning).toBeEnabled();
    expect(screen.getByRole('button', { name: /Chiều/ })).toBeEnabled();
  });

  it('shows only the selected day periods and requires a new period after changing day', async () => {
    const user = userEvent.setup();
    prayerRepo.getWellbeingSeasonAvailability.mockResolvedValue({ lunarYear: 2027, slots: [
      { id: 'day1-morning', lunarDay: 1, period: 'morning', capacity: 200, remaining: 10, isPast: false },
      { id: 'day2-evening', lunarDay: 2, period: 'evening', capacity: 200, remaining: 20, isPast: false },
    ] });
    render(<WellbeingBookingDialog booking={null} onClose={vi.fn()} onSubmit={vi.fn()} />);
    await screen.findByRole('button', { name: /Sáng/ });
    expect(screen.queryByRole('button', { name: /Tối/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /02\s*Tháng 1 ÂL/ }));
    expect(screen.queryByRole('button', { name: /Sáng/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tối/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Xác nhận đặt lịch' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Tối/ }));
    expect(screen.getByRole('button', { name: 'Xác nhận đặt lịch' })).toBeEnabled();
  });
});
