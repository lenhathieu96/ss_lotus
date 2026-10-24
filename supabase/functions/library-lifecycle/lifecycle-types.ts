export type LibraryUploadPreparation = Readonly<{
  actorId: string;
  categoryId: string;
  title: string;
  author: string | null;
  originalFilename: string;
  expectedSize: number;
}>;

export type PreparedLibraryUpload = Readonly<{
  documentId: string;
  expiresAt: string;
  stagingPath: string;
  uploadUrl: string;
  expiresInSeconds: number;
}>;

export type LibraryUploadSettlement = Readonly<{ status: "published" }>;

export type LibraryUploadRecovery =
  | LibraryUploadSettlement
  | Readonly<{ status: "published"; message: string }>
  | Readonly<{ status: "pending"; message: string }>
  | Readonly<{ status: "reupload_required"; message: string }>
  | Readonly<
    {
      status: "needs_s3_access";
      capability: LibraryS3AccessCapability;
      message: string;
    }
  >;

export type LibraryS3AccessCapability =
  | "read_staging"
  | "write_document"
  | "delete_staging"
  | "delete_document";

export interface LibraryServerLifecycleSource {
  prepareUpload(
    input: LibraryUploadPreparation,
  ): Promise<PreparedLibraryUpload>;
  completeUpload(
    documentId: string,
    actorId: string,
  ): Promise<LibraryUploadSettlement>;
  resolveUpload(
    documentId: string,
    actorId: string,
  ): Promise<
    LibraryUploadSettlement | Readonly<{ status: "pending"; message: string }>
  >;
  recoverUpload(
    documentId: string,
    actorId: string,
  ): Promise<LibraryUploadRecovery>;
  cancelUpload(documentId: string, actorId: string): Promise<void>;
  cleanupExpiredUploads(actorId: string): Promise<number>;
  deleteDocument(documentId: string, actorId: string): Promise<void>;
  reconcileDocument(
    documentId: string,
    actorId: string,
  ): Promise<"published" | "deleted">;
  getDownloadUrl(documentId: string): Promise<string | null>;
}
