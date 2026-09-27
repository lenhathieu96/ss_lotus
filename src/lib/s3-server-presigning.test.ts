import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { describe, expect, it } from 'vitest';

describe('S3 upload presigning', () => {
  it('does not sign an empty-payload checksum for a browser PUT upload', async () => {
    const client = new S3Client({
      region: 'ap-southeast-1',
      credentials: { accessKeyId: 'test-access-key', secretAccessKey: 'test-secret-key' },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    const signedUrl = new URL(await getSignedUrl(client, new PutObjectCommand({
      Bucket: 'test-library-bucket',
      Key: 'pending/test-document.pdf',
      ContentType: 'application/pdf',
      IfNoneMatch: '*',
    }), { expiresIn: 900 }));

    expect(signedUrl.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(signedUrl.searchParams.has('x-amz-sdk-checksum-algorithm')).toBe(false);
  });
});
