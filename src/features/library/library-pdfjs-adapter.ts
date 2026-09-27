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

  adapterPromise ??= Promise.all([
    import('pdfjs-dist/build/pdf.mjs'),
    import('pdfjs-dist/web/pdf_viewer.mjs'),
  ]).then(([core, viewer]) => {
    // Next emits this module as a client asset. Keeping worker and viewer at the
    // same pinned package version prevents PDF.js version-skew failures.
    core.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();

    return { core, viewer };
  });

  return adapterPromise;
}
