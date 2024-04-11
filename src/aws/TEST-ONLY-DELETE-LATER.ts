import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import type { S3Location } from './types';
import { getS3Client } from './s3-client';

export async function listS3Objects({
    Bucket,
    // Key,
    Prefix
  }: S3Location): Promise<string[]> {
    try {
      const parameters = {
        Bucket,
        // Key,
        Prefix
      };
  
      const data = await getS3Client().send(new ListObjectsV2Command(parameters));
  
      return data.Contents?.map((element) => element.Key ?? '') ?? [];
    } catch (error_) {
      const error =
        error_ instanceof Error
          ? new Error(
              `Could not list files in S3: ${error_.name} ${error_.message}`
            )
          : error_;
      throw error;
    }
  }
  