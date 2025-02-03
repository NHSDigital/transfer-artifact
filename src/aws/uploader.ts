import { type UploadOptions } from '@actions/artifact';
import { uploadObjectToS3 } from './put-data-s3';
import fs from 'node:fs';
import * as core from '@actions/core';
import {
  getUploadSpecification,
  UploadSpecification,
} from '../upload-specification';
import pMap from 'p-map';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryUpload(
  uploadFn: () => Promise<any>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<any> {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.includes('bucket does not exist')) {
        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        core.info(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw error; // Throw immediately for other types of errors
    }
  }
  throw lastError;
}

function logUploadInformation(begin: number, successfulUploads: boolean[]) {
  const finish = Date.now();
  const successCount = successfulUploads.filter(success => success).length;
  const failureCount = successfulUploads.length - successCount;
  const duration = finish - begin;

  if (failureCount > 0) {
    core.error(`Failed to upload ${failureCount} files`);
  }

  core.info(
    `Successfully uploaded ${successCount} files in ${(duration / 1000).toFixed(3)} seconds.`
  );
}

export async function uploadArtifact(
  artifactName: string,
  filesToUpload: string[],
  rootDirectory: string,
  options: UploadOptions,
  bucket: string,
  folderName: string,
  concurrency: number
): Promise<any> {
  const startTime = Date.now();

  try {
    const uploadSpec: UploadSpecification[] = getUploadSpecification(
      artifactName,
      rootDirectory,
      filesToUpload
    );

    // Initial delay before starting uploads
    await sleep(2000); // Wait 2 seconds for bucket to be fully ready

    const mapper = async (fileSpec: UploadSpecification): Promise<boolean> => {
      try {
        // Check if bucket exists before upload
        const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
        const s3Client = new S3Client({
          forcePathStyle: true,
          endpoint: process.env.AWS_ENDPOINT_URL || 'http://s3.localhost.localstack.cloud:4566',
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock-key',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret'
          },
          region: process.env.AWS_REGION || 'us-east-1'
        });

        // Verify bucket exists
        try {
          await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
        } catch (error) {
          core.error(`Bucket verification failed: ${bucket}`);
          throw error;
        }

        // URL encode the Key but maintain path structure
        const keyParts = `ci-pipeline-upload-artifacts/${folderName}/${fileSpec.uploadFilePath}`.split('/');
        const encodedKey = keyParts.map(part => encodeURIComponent(part)).join('/');

        await retryUpload(() => uploadObjectToS3(
          {
            Body: fs.createReadStream(fileSpec.absoluteFilePath),
            Bucket: bucket,
            Key: encodedKey,
          },
          core
        ));
        return true; // Upload succeeded
      } catch (error) {
        core.error(`Failed to upload ${fileSpec.uploadFilePath}: ${error}`);
        return false; // Upload failed
      }
    };

    const results = await pMap(uploadSpec, mapper, {
      concurrency,
      stopOnError: false
    });

    const hasFailures = results.some(success => !success);
    logUploadInformation(startTime, results);

    if (hasFailures) {
      core.setFailed(`Some files failed to upload for ${artifactName}`);
      return false;
    }

    return true;
  } catch (error) {
    core.setFailed((error as Error).message);
    return false;
  }
}