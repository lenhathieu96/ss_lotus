export type QueueResult<T, R> = Readonly<{ item: T; status: 'fulfilled'; value: R } | { item: T; status: 'rejected'; reason: unknown }>;

export async function runLibraryUploadQueue<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onSettled?: (result: QueueResult<T, R>, index: number) => void,
): Promise<Array<QueueResult<T, R>>> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Concurrency must be a positive integer.');
  const results: Array<QueueResult<T, R>> = new Array(items.length);
  let nextIndex = 0;
  async function consume() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      const item = items[index];
      try {
        const result = await worker(item, index);
        const settled: QueueResult<T, R> = { item, status: 'fulfilled', value: result };
        results[index] = settled;
        onSettled?.(settled, index);
      } catch (reason) {
        const settled: QueueResult<T, R> = { item, status: 'rejected', reason };
        results[index] = settled;
        onSettled?.(settled, index);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, consume));
  return results;
}
