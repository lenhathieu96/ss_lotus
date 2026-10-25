/**
 * Browser-only PDF.js boundary.
 *
 * Keep both PDF.js packages behind this dynamic import so route rendering never
 * evaluates worker or DOM-dependent viewer code on the server.
 */
export type PdfJsCore = typeof import('pdfjs-dist/build/pdf.mjs');
export type PdfJsViewer = typeof import('pdfjs-dist/web/pdf_viewer.mjs');
export type PdfOutlineItem = import('pdfjs-dist/build/pdf.mjs').PdfOutlineItem;

export type PdfJsAdapter = Readonly<{
  core: PdfJsCore;
  viewer: PdfJsViewer;
}>;

let adapterPromise: Promise<PdfJsAdapter> | undefined;

export function loadPdfJsAdapter(): Promise<PdfJsAdapter> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Trình đọc PDF chỉ hoạt động trong trình duyệt.'));
  }

  adapterPromise ??= import('pdfjs-dist/build/pdf.mjs').then(async (core) => {
    // Next emits this module as a client asset. Keeping worker and viewer at the
    // same pinned package version prevents PDF.js version-skew failures. The
    // viewer reads globalThis.pdfjsLib while it evaluates, and the core module
    // initializes that global as a side effect, so these imports must remain
    // ordered rather than running inside Promise.all.
    core.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    const viewer = await import('pdfjs-dist/web/pdf_viewer.mjs');
    return { core, viewer };
  });

  return adapterPromise;
}
