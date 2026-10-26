import { createLucideIcon } from 'lucide-react';

/** Joined palms, using the same stroke and sizing contract as the other UI icons. */
export const PrayerHandsIcon = createLucideIcon('PrayerHands', [
  ['path', { d: 'M12 16V4a1.5 1.5 0 0 0-3 0v5L6 13v4', key: 'left-palm' }],
  ['path', { d: 'M12 16V4a1.5 1.5 0 0 1 3 0v5l3 4v4', key: 'right-palm' }],
  ['path', { d: 'm3 20 3-3 6 3-3 3Zm18 0-3-3-6 3 3 3Z', key: 'cuffs' }],
  ['path', { d: 'm9 9-1 5 4 6 4-6-1-5', key: 'joined-hands' }],
]);
