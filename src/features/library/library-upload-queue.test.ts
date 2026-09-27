import { describe, expect, it } from 'vitest';
import { runLibraryUploadQueue } from './library-upload-queue';

describe('runLibraryUploadQueue', () => {
  it('limits concurrent uploads and keeps independent results', async () => {
    let active = 0;
    let peak = 0;
    const results = await runLibraryUploadQueue([1, 2, 3, 4, 5], 3, async (item) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, item === 2 ? 1 : 3));
      active -= 1;
      if (item === 3) throw new Error('one failed');
      return item * 2;
    });
    expect(peak).toBe(3);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled', 'rejected', 'fulfilled', 'fulfilled']);
  });
});
