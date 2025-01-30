import { S3Client } from '@aws-sdk/client-s3';
import { region } from './locations';
import * as AWSMock from 'mock-aws-s3';
import { Readable } from 'stream';
import * as path from 'path';

let s3Client: S3Client | null = null;

// Define proper types for mock-aws-s3
interface MockS3Instance {
  putObject: (params: any, callback: (err: Error | null, data?: any) => void) => void;
  getObject: (params: any, callback: (err: Error | null, data?: any) => void) => void;
  listObjects: (params: any, callback: (err: Error | null, data?: any) => void) => void;
  headBucket: (params: any, callback: (err: Error | null, data?: any) => void) => void;
  _clear?: () => void;
}

interface MockS3Options {
  params: {
    Bucket: string;
  };
}

let mockS3Backend: MockS3Instance | null = null;

// Get the mock S3 path from environment
const getMockS3Path = (): string =>
  process.env.MOCK_AWS_S3_PATH || '/tmp/mock-s3';

// Get configured bucket from environment
const getConfiguredBucket = (): string =>
  process.env.ARTIFACTS_S3_BUCKET || 'mock-bucket';

// Initialize mock S3 backend once
function getMockS3Backend(): MockS3Instance {
  if (!mockS3Backend) {
    const mockPath = getMockS3Path();
    const bucketName = getConfiguredBucket();

    // Ensure the mock directory exists
    const mockConfig = {
      params: {
        Bucket: bucketName
      }
    };

    mockS3Backend = new (AWSMock.S3 as any)(mockConfig) as MockS3Instance;
  }
  return mockS3Backend;
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    try {
      // Get the region first - this could throw an error
      const currentRegion = region();

      const backend = getMockS3Backend();

      // Create a wrapper that matches AWS SDK v3 interface
      s3Client = {
        send: async (command: any) => {
          const operation = command.constructor.name.replace('Command', '').toLowerCase();
          const { Bucket = getConfiguredBucket(), Key } = command.input;

          return new Promise((resolve, reject) => {
            try {
              switch (operation) {
                case 'putobject': {
                  const { Body } = command.input;
                  let content = Body;

                  // Handle different Body types
                  if (Body instanceof Readable) {
                    const chunks: any[] = [];
                    Body.on('data', chunk => chunks.push(chunk));
                    Body.on('end', () => {
                      const finalContent = Buffer.concat(chunks);
                      backend.putObject({
                        Bucket,
                        Key,
                        Body: finalContent
                      }, (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                      });
                    });
                    Body.on('error', reject);
                    return;
                  } else if (Buffer.isBuffer(Body)) {
                    content = Body;
                  } else if (typeof Body === 'string') {
                    content = Buffer.from(Body);
                  } else {
                    content = Buffer.from(String(Body));
                  }

                  backend.putObject({
                    Bucket,
                    Key,
                    Body: content
                  }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                  });
                  break;
                }

                case 'getobject':
                  backend.getObject({ Bucket, Key }, (err, data) => {
                    if (err) reject(err);
                    else {
                      // Convert data to match AWS SDK v3 response format
                      resolve({
                        Body: Readable.from(data.Body as Buffer)
                      });
                    }
                  });
                  break;

                case 'listobjectsv2': {
                  const prefix = command.input.Prefix || '';
                  backend.listObjects({ Bucket, Prefix: prefix }, (err, data) => {
                    if (err) reject(err);
                    else {
                      // Convert to AWS SDK v3 format
                      resolve({
                        Contents: (data.Contents || []).map(item => ({
                          Key: item.Key,
                          Size: item.Size
                        }))
                      });
                    }
                  });
                  break;
                }

                case 'headbucket':
                  backend.headBucket({ Bucket }, (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                  });
                  break;

                default:
                  reject(new Error(`Unsupported operation: ${operation}`));
              }
            } catch (error) {
              reject(error);
            }
          });
        }
      } as S3Client;
    } catch (error) {
      // Ensure we don't create the mock backend if region throws
      mockS3Backend = null;
      throw error;
    }
  }

  return s3Client;
}

export function resetS3Client(): void {
  if (mockS3Backend?._clear) {
    mockS3Backend._clear();
  }
  mockS3Backend = null;
  s3Client = null;
}