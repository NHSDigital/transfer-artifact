import { S3Client } from '@aws-sdk/client-s3';
import { region } from './locations';
import * as AWSMock from 'mock-aws-s3';

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    // Get the region first - this could throw an error
    const currentRegion = region();

    // For tests or mock environment, use mock-aws-s3
    if (process.env.MOCK_AWS_S3 === 'true') {
      const mockS3 = new AWSMock.S3({
        params: { Bucket: process.env.ARTIFACTS_S3_BUCKET || 'mock-bucket' }
      });

      s3Client = {
        send: async (command: any) => {
          const operation = command.constructor.name.replace('Command', '').toLowerCase();
          return new Promise((resolve, reject) => {
            if (operation === 'putobject') {
              mockS3.putObject({
                Bucket: command.input.Bucket,
                Key: command.input.Key,
                Body: command.input.Body,
                ACL: command.input.ACL
              }, (err: any, data: any) => {
                if (err) reject(err);
                else resolve(data);
              });
            } else if (operation === 'getobject') {
              mockS3.getObject({
                Bucket: command.input.Bucket,
                Key: command.input.Key
              }, (err: any, data: any) => {
                if (err) reject(err);
                else resolve({ Body: data.Body });
              });
            } else if (operation === 'listobjectsv2') {
              mockS3.listObjects({
                Bucket: command.input.Bucket,
                Prefix: command.input.Prefix
              }, (err: any, data: any) => {
                if (err) reject(err);
                else resolve({
                  Contents: data.Contents?.map((item: any) => ({
                    Key: item.Key,
                    Size: item.Size
                  })) || []
                });
              });
            } else if (operation === 'headbucket') {
              mockS3.headBucket({
                Bucket: command.input.Bucket
              }, (err: any, data: any) => {
                if (err) reject(err);
                else resolve(data);
              });
            } else {
              reject(new Error(`Unsupported operation: ${operation}`));
            }
          });
        }
      } as unknown as S3Client;
    } else {
      // For non-mock environments, use AWS SDK's S3Client
      const options = {
        region: currentRegion || process.env.AWS_REGION || 'us-east-1',
        ...(process.env.AWS_ENDPOINT_URL && {
          endpoint: process.env.AWS_ENDPOINT_URL,
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
          }
        })
      };

      s3Client = new S3Client(options);
    }
  }

  return s3Client;
}

export function resetS3Client(): void {
  s3Client = null;
}