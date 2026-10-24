declare module 'pdfjs-dist/build/pdf.mjs' {
  export type PdfOutlineItem = Readonly<{
    title: string;
    dest: unknown;
    items?: PdfOutlineItem[];
  }>;

  export type PdfDocumentProxy = Readonly<{
    getPage: (pageNumber: number) => Promise<PdfPageProxy>;
    numPages: number;
    getOutline: () => Promise<PdfOutlineItem[] | null>;
    cleanup?: () => void;
    destroy?: () => Promise<void>;
  }>;

  export type PdfPageProxy = Readonly<{
    getViewport: (options: Readonly<{ scale: number }>) => Readonly<{ height: number; width: number }>;
    render: (options: Readonly<{ canvasContext: CanvasRenderingContext2D; viewport: Readonly<{ height: number; width: number }> }>) => Readonly<{
      cancel: () => void;
      promise: Promise<void>;
    }>;
  }>;

  export type PdfLoadingTask = {
    promise: Promise<PdfDocumentProxy>;
    destroy: () => Promise<void>;
    onProgress?: (progress: Readonly<{ loaded: number; total: number }>) => void;
  };

  export const AnnotationMode: Readonly<{ DISABLE: number }>;
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(parameters: Record<string, unknown>): PdfLoadingTask;
}

declare module 'pdfjs-dist/web/pdf_viewer.mjs' {
  export class EventBus {
    on(eventName: string, listener: (event: Record<string, unknown>) => void): void;
    off(eventName: string, listener: (event: Record<string, unknown>) => void): void;
  }

  export class PDFFindController {
    constructor(options: Readonly<{ linkService: PDFLinkService; eventBus: EventBus }>);
    executeCommand(command: 'find' | 'findagain', state: Record<string, unknown>): void;
  }

  export class PDFLinkService {
    constructor(options: Readonly<{ eventBus: EventBus }>);
    setViewer(viewer: PDFViewer): void;
    setDocument(document: unknown): void;
    goToDestination(destination: unknown): Promise<void>;
  }

  export class PDFViewer {
    constructor(options: Readonly<{
      container: HTMLElement;
      viewer: HTMLElement;
      eventBus: EventBus;
      linkService: PDFLinkService;
      findController: PDFFindController;
      textLayerMode: number;
      annotationMode: number;
      abortSignal: AbortSignal;
      removePageBorders: boolean;
      maxCanvasPixels: number;
    }>);
    currentPageNumber: number;
    currentScale: number;
    currentScaleValue: string | number;
    setDocument(document: unknown): void;
    increaseScale(steps?: number): void;
    decreaseScale(steps?: number): void;
    cleanup(): void;
  }

}
