import { createBrowserLibraryNetworkSource } from './network/browser-library-network-source';
import { createLibraryBrowserNetworkConfig } from './network/config';
import type { LibraryBrowserNetwork } from './network/interface';
import { getLibraryDataSourceConfig, type LibraryDataSourceConfig } from './library-data-source-config';
import type { LibraryUploadTicket } from '@/features/library/library-domain';

export type LibraryUploadRecovery = Readonly<{
  status: 'published' | 'reupload_required' | 'needs_s3_access' | 'pending';
  message?: string;
  capability?: string;
}>;

/** Stable feature-facing boundary for browser library operations. */
export interface LibraryDataSource {
  prepareUpload(input: { categoryId: string; title: string; author: string; file: File }): Promise<LibraryUploadTicket>;
  completeUpload(documentId: string): Promise<void>;
  resolveUpload(documentId: string): Promise<{ status: 'published' | 'pending' }>;
  recoverUpload(documentId: string): Promise<LibraryUploadRecovery>;
  cancelUpload(documentId: string): Promise<void>;
  cleanupUploads(): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  reconcileDocument(documentId: string): Promise<void>;
  publicDocumentUrl(documentId: string): string;
  downloadUrl(documentId: string): string;
}

export function createLibraryDataSource(
  config?: LibraryDataSourceConfig,
  network: LibraryBrowserNetwork = createBrowserLibraryNetworkSource(createLibraryBrowserNetworkConfig()),
): LibraryDataSource {

  return {
    prepareUpload(input): Promise<LibraryUploadTicket> {
      return network.request('/api/library/uploads', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: input.categoryId,
          title: input.title,
          author: input.author,
          originalFilename: input.file.name,
          expectedSize: input.file.size,
        }),
      });
    },
    async completeUpload(documentId): Promise<void> {
      await network.request(`/api/library/uploads/${documentId}/complete`, { method: 'POST', body: '{}' });
    },
    resolveUpload(documentId): Promise<{ status: 'published' | 'pending' }> {
      return network.request(`/api/library/uploads/${documentId}/resolve`, { method: 'POST', body: '{}' });
    },
    recoverUpload(documentId): Promise<LibraryUploadRecovery> {
      return network.request(`/api/library/uploads/${documentId}/recover`, { method: 'POST', body: '{}' });
    },
    async cancelUpload(documentId): Promise<void> {
      await network.request(`/api/library/uploads/${documentId}`, { method: 'DELETE' });
    },
    async cleanupUploads(): Promise<void> {
      await network.request('/api/library/maintenance/cleanup', { method: 'POST', body: '{}' });
    },
    async deleteDocument(documentId): Promise<void> {
      await network.request(`/api/library/documents/${documentId}/delete`, { method: 'DELETE' });
    },
    async reconcileDocument(documentId): Promise<void> {
      await network.request(`/api/library/documents/${documentId}/reconcile`, { method: 'POST', body: '{}' });
    },
    publicDocumentUrl(documentId): string {
      const publicDocumentBaseUrl = config?.publicDocumentBaseUrl ?? getLibraryDataSourceConfig().publicDocumentBaseUrl;
      if (!publicDocumentBaseUrl) throw new Error('Thiếu cấu hình NEXT_PUBLIC_S3_LIBRARY_BASE_URL.');
      const url = new URL(publicDocumentBaseUrl);
      if (url.protocol !== 'https:') throw new Error('URL thư viện PDF phải dùng HTTPS.');
      url.pathname = `${url.pathname.replace(/\/$/, '')}/documents/${documentId}.pdf`;
      return url.toString();
    },
    downloadUrl(documentId): string {
      return `/api/library/documents/${documentId}/download`;
    },
  };
}

export const libraryDataSource = createLibraryDataSource();
