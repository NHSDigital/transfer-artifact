import { S3Client as S3ClientConstructor } from '@aws-sdk/client-s3';
import { region } from './locations';

let s3Client: S3ClientConstructor;

export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3ClientConstructor({ region: region() });
  }

  return s3Client;
}
