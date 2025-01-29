// src/aws/s3-client.ts

import { S3Client as S3ClientConstructor } from '@aws-sdk/client-s3';
import { region } from './locations';

let s3Client: S3ClientConstructor | null = null;

export function getS3Client(): S3ClientConstructor {
  if (!s3Client) {
    const options: any = {
      region: region(),
      // For testing, if we detect mock credentials, use a mock endpoint
      ...(process.env.AWS_ACCESS_KEY_ID === 'mock-key' && {
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
        },
        endpoint: 'http://localhost:4566' // LocalStack compatible endpoint
      })
    };

    s3Client = new S3ClientConstructor(options);
  }

  return s3Client;
}

// For testing purposes, allow resetting the client
export function resetS3Client(): void {
  s3Client = null;
}