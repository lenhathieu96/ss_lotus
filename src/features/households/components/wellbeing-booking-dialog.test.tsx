import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
