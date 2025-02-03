import { S3Client } from '@aws-sdk/client-s3';
import { region } from './locations';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    // Base options that will be used in all environments
    const baseOptions = {
      region: region()
    };

    // For CI/LocalStack environments (either in test or actual CI)
    if (true) {
      s3Client = new S3Client({
        forcePathStyle: true, // Required for LocalStack
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
        },
        endpoint: process.env.AWS_ENDPOINT_URL || 'http://s3.localhost.localstack.cloud:4566',
        // The region must be set for LocalStack, even though it's not used
        region: process.env.AWS_REGION || 'us-east-1'
      });
      return s3Client;
    }

    // For production environment, use standard AWS configuration
    s3Client = new S3Client(baseOptions);
  }

  return s3Client;
}

/**
 * Resets the S3 client singleton instance
 */
export function resetS3Client(): void {
  s3Client = null;
}