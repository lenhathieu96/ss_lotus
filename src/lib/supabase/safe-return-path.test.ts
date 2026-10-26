import { describe, expect, it } from 'vitest';
import { isSafeReturnPath, safeReturnPath } from './safe-return-path';

describe('safe return paths', () => {
  it('accepts local application paths', () => {
    expect(isSafeReturnPath('/households?tab=members')).toBe(true);
    expect(safeReturnPath('/admin/thu-vien')).toBe('/admin/thu-vien');
  });

  it('rejects origins, protocol-relative paths, and encoded authority paths', () => {
    for (const value of ['https://attacker.example', '//attacker.example', '/\\attacker.example', '/%2f%2fattacker.example']) {
      expect(isSafeReturnPath(value)).toBe(false);
    }
    expect(safeReturnPath('https://attacker.example')).toBe('/households');
  });
});
