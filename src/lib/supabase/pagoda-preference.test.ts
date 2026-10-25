import { describe, expect, it } from 'vitest';
import { activePagodaPreferenceKey, activePagodaPreferenceValue } from './pagoda-preference';

describe('active pagoda preference', () => {
  it('scopes the preference to a verified user', () => {
    expect(activePagodaPreferenceKey('user-1')).toBe('ss-lotus.active-pagoda-id.user-1');
  });

  it('does not accept malformed cookie values', () => {
    expect(activePagodaPreferenceValue('pagoda-1')).toBe('pagoda-1');
    expect(activePagodaPreferenceValue('\u0000bad')).toBeNull();
  });
});
