/** @deprecated Import `libraryDataSource` from `library-data-source` instead. */
import { libraryDataSource } from '@/data/library/library-data-source';

export type { LibraryUploadRecovery } from '@/data/library/library-data-source';

export const prepareLibraryS3Upload = libraryDataSource.prepareUpload;
export const completeLibraryS3Upload = libraryDataSource.completeUpload;
export const resolveLibraryS3Upload = libraryDataSource.resolveUpload;
export const recoverLibraryS3Upload = libraryDataSource.recoverUpload;
export const cancelLibraryS3Upload = libraryDataSource.cancelUpload;
export const cleanupLibraryS3Uploads = libraryDataSource.cleanupUploads;
export const deleteLibraryS3Document = libraryDataSource.deleteDocument;
export const reconcileLibraryS3Document = libraryDataSource.reconcileDocument;
export const publicLibraryDocumentUrl = libraryDataSource.publicDocumentUrl;
export const libraryDownloadUrl = libraryDataSource.downloadUrl;
