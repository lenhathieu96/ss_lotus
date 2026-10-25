import { describe, expect, it } from 'vitest';
import { loadPdfJsAdapter } from './library-pdfjs-adapter';

describe('loadPdfJsAdapter', () => {
  it('loads the viewer after the core module initializes its shared browser API', async () => {
    const adapter = await loadPdfJsAdapter();

    expect(adapter.core.GlobalWorkerOptions.workerSrc).toContain('pdf.worker');
    expect(adapter.viewer.PDFViewer).toBeTypeOf('function');
  });
});
