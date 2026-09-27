import { beforeEach, describe, expect, it, vi } from 'vitest';

const { send, getSignedUrl, clientConfigurations } = vi.hoisted(() => ({ send: vi.fn(), getSignedUrl: vi.fn(), clientConfigurations: [] as unknown[] }));
vi.mock('server-only', () => ({}));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { constructor(configuration: unknown) { clientConfigurations.push(configuration); } send = send; },
  PutObjectCommand: class { constructor(readonly input: unknown) {} },
  HeadObjectCommand: class { constructor(readonly input: unknown) {} },
  GetObjectCommand: class { constructor(readonly input: unknown) {} },
  CopyObjectCommand: class { constructor(readonly input: unknown) {} },
  DeleteObjectCommand: class { constructor(readonly input: unknown) {} },
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));

import { createStagingUploadUrl, isS3AccessDenied, isS3NotFound, publicDocumentUrl, s3LibraryKeys } from './s3-server';

describe('S3 library adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.AWS_REGION = 'ap-southeast-1';
    process.env.S3_LIBRARY_BUCKET = 'ss-lotus-library';
    process.env.NEXT_PUBLIC_S3_LIBRARY_BASE_URL = 'https://ss-lotus-library.s3.ap-southeast-1.amazonaws.com';
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SECRET_ACCESS;
    clientConfigurations.splice(0);
  });

  it('derives immutable final and private staging keys from the document ID', () => {
    expect(s3LibraryKeys.documentKey('doc-1')).toBe('documents/doc-1.pdf');
    expect(s3LibraryKeys.stagingKey('doc-1')).toBe('pending/doc-1.pdf');
    expect(publicDocumentUrl('doc-1')).toBe('https://ss-lotus-library.s3.ap-southeast-1.amazonaws.com/documents/doc-1.pdf');
  });

  it('issues a short create-only PUT capability for the private staging key', async () => {
    getSignedUrl.mockResolvedValue('https://signed.example.test/put');
    await expect(createStagingUploadUrl('doc-1')).resolves.toEqual({ stagingPath: 'pending/doc-1.pdf', uploadUrl: 'https://signed.example.test/put', expiresInSeconds: 900 });
    expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ input: expect.objectContaining({ Bucket: 'ss-lotus-library', Key: 'pending/doc-1.pdf', ContentType: 'application/pdf', IfNoneMatch: '*' }) }), { expiresIn: 900 });
  });

  it('accepts the project-specific AWS secret alias for server-side S3 credentials', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'access-key-id';
    process.env.AWS_SECRET_ACCESS = 'secret-access';
    getSignedUrl.mockResolvedValue('https://signed.example.test/put');

    await createStagingUploadUrl('doc-1');

    expect(clientConfigurations).toContainEqual({
      region: 'ap-southeast-1',
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: 'access-key-id', secretAccessKey: 'secret-access' },
    });
  });

  it('classifies only explicit S3 403 and 404 responses for safe route handling', () => {
    expect(isS3AccessDenied({ $metadata: { httpStatusCode: 403 } })).toBe(true);
    expect(isS3AccessDenied({ $metadata: { httpStatusCode: 404 } })).toBe(false);
    expect(isS3NotFound({ $metadata: { httpStatusCode: 404 } })).toBe(true);
  });
});
