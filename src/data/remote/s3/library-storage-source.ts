import 'server-only';

import {
  CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const PDF_CONTENT_TYPE = 'application/pdf';
const UPLOAD_TICKET_SECONDS = 15 * 60;

export type S3ObjectObservation = Readonly<{ size: number; contentType: string; etag: string | null }>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function bucket(): string { return required('S3_LIBRARY_BUCKET'); }

function client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  // AWS_SECRET_ACCESS is the existing Vercel variable name for this project.
  // Prefer the SDK-standard name when both are configured.
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS;
  const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
  return new S3Client({
    region: required('AWS_REGION'),
    // A presigned browser upload does not have a request body at signing time.
    // Avoid pinning the checksum of an empty payload into its query string.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(credentials ? { credentials } : {}),
  });
}

function documentKey(documentId: string): string { return `documents/${documentId}.pdf`; }
function stagingKey(documentId: string): string { return `pending/${documentId}.pdf`; }

function publicBaseUrl(): URL {
  const url = new URL(required('NEXT_PUBLIC_S3_LIBRARY_BASE_URL'));
  if (url.protocol !== 'https:') throw new Error('NEXT_PUBLIC_S3_LIBRARY_BASE_URL must use HTTPS.');
  return url;
}

function copySource(key: string): string {
  return `/${bucket()}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function safeAttachmentName(value: string): string {
  const normalized = value.normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  return `${(normalized || 'tai-lieu').slice(0, 160)}.pdf`;
}

export function isS3NotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && '$metadata' in error
    && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
}

export function isS3AccessDenied(error: unknown): boolean {
  return typeof error === 'object' && error !== null && '$metadata' in error
    && (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 403;
}

export async function createStagingUploadUrl(documentId: string): Promise<{ stagingPath: string; uploadUrl: string; expiresInSeconds: number }> {
  const key = stagingKey(documentId);
  const uploadUrl = await getSignedUrl(client(), new PutObjectCommand({
    Bucket: bucket(), Key: key, ContentType: PDF_CONTENT_TYPE, IfNoneMatch: '*',
  }), { expiresIn: UPLOAD_TICKET_SECONDS });
  return { stagingPath: key, uploadUrl, expiresInSeconds: UPLOAD_TICKET_SECONDS };
}

export async function headObject(key: string): Promise<S3ObjectObservation | null> {
  try {
    const result = await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: result.ContentLength ?? -1, contentType: result.ContentType ?? '', etag: result.ETag ?? null };
  } catch (error) {
    if (isS3NotFound(error)) return null;
    throw error;
  }
}

export async function verifyStagingPdf(documentId: string, expectedSize: number): Promise<S3ObjectObservation> {
  return verifyPdfObject(stagingKey(documentId), expectedSize, 'The staged PDF object');
}

async function verifyPdfObject(key: string, expectedSize: number, label: string): Promise<S3ObjectObservation> {
  const observed = await headObject(key);
  if (!observed) throw new Error(`${label} is missing.`);
  if (observed.size !== expectedSize) throw new Error(`${label} size does not match the ticket.`);
  if (observed.contentType.toLowerCase() !== PDF_CONTENT_TYPE) throw new Error(`${label} is not an application/pdf.`);
  const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: 'bytes=0-4' }));
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes || new TextDecoder().decode(bytes) !== '%PDF-') throw new Error(`${label} does not have a PDF signature.`);
  return observed;
}

export async function verifyFinalPdf(documentId: string, expectedSize: number): Promise<S3ObjectObservation> {
  return verifyPdfObject(documentKey(documentId), expectedSize, 'The copied public PDF');
}

export async function copyStagingToDocument(documentId: string): Promise<S3ObjectObservation> {
  const finalKey = documentKey(documentId);
  const existing = await headObject(finalKey);
  if (existing) return existing;
  await client().send(new CopyObjectCommand({
    Bucket: bucket(), Key: finalKey, CopySource: copySource(stagingKey(documentId)),
    ContentType: PDF_CONTENT_TYPE, ContentDisposition: 'inline', MetadataDirective: 'REPLACE',
  }));
  const copied = await headObject(finalKey);
  if (!copied || copied.contentType.toLowerCase() !== PDF_CONTENT_TYPE) throw new Error('The copied public PDF could not be verified.');
  return copied;
}

export async function deleteObjectAndVerify(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  if (await headObject(key)) throw new Error('The S3 object still exists after deletion.');
}

export function publicDocumentUrl(documentId: string): string {
  const url = publicBaseUrl();
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${documentKey(documentId)}`;
  return url.toString();
}

export async function createDownloadUrl(documentId: string, title: string): Promise<string> {
  return getSignedUrl(client(), new GetObjectCommand({
    Bucket: bucket(), Key: documentKey(documentId),
    ResponseContentType: PDF_CONTENT_TYPE,
    ResponseContentDisposition: `attachment; filename="${safeAttachmentName(title)}"`,
  }), { expiresIn: UPLOAD_TICKET_SECONDS });
}

export const s3LibraryKeys = { documentKey, stagingKey, PDF_CONTENT_TYPE, UPLOAD_TICKET_SECONDS };
