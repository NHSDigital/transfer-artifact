import { S3Client } from '@aws-sdk/client-s3';
import { region } from './locations';

let s3Client: S3Client | null = null;

/**
 * Returns a singleton S3 client that supports LocalStack
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    const isLocalStack = process.env.AWS_ENDPOINT_URL || process.env.GITHUB_ACTIONS || process.env.NODE_ENV === 'test';

    s3Client = new S3Client({
      forcePathStyle: isLocalStack, // Required for LocalStack
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: isLocalStack ? process.env.AWS_ENDPOINT_URL || 'http://localhost:4566' : undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
      }
    });
  }

  return s3Client;
}

/**
 * Resets the S3 client singleton instance (useful for testing)
 */
export function resetS3Client(): void {
  s3Client = null;
}
