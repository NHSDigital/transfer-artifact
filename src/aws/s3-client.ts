import { S3Client as S3ClientConstructor } from '@aws-sdk/client-s3';
import { region } from './locations';

let s3Client: S3ClientConstructor | null = null;

export function getS3Client(): S3ClientConstructor {
  if (!s3Client) {
    // Base options that will be used in all environments
    const baseOptions = {
      region: region()
    };

    // If we're in a test environment, use base options
    if (process.env.NODE_ENV === 'test') {
      s3Client = new S3ClientConstructor(baseOptions);
      return s3Client;
    }

    // For mock or CI environments, add mock credentials and endpoint
    if (process.env.AWS_ACCESS_KEY_ID === 'mock-key' || process.env.GITHUB_ACTIONS) {
      const options = {
        ...baseOptions,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
        },
        endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566'
      };
      s3Client = new S3ClientConstructor(options);
    } else {
      // For all other environments, use standard AWS configuration
      s3Client = new S3ClientConstructor(baseOptions);
    }
  }

  return s3Client;
}

export function resetS3Client(): void {
  s3Client = null;
}