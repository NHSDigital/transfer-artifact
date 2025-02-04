import type { Buffer } from 'node:buffer';
import type { Readable } from 'node:stream';

import type { ObjectCannedACL } from '@aws-sdk/client-s3';

// we can find objects using an exact Key, which has the full path to the object
// or we can use a Prefix, e.g. the bucket name, to return every file with a specific prefix
export type S3Location = {
  Bucket: string;
  Key?: string;
  Prefix?: string;
};

export type Upload = {
  Body: Readable | Blob | string | Uint8Array | Buffer;
  Bucket: string;
  Key: string;
  ACL?: ObjectCannedACL;
  ChecksumSHA256?: string;
};
