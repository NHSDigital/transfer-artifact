/* eslint-disable no-unused-vars */
import { type UploadOptions } from '@actions/artifact';
import { uploadObjectToS3 } from './put-data-s3';
import fs from 'node:fs';
import * as core from '@actions/core';
import {
  getUploadSpecification,
  UploadSpecification,
} from '../upload-specification';
import pMap from 'p-map';
import { Inputs } from '../constants';

function logUploadInformation(begin: number, uploads: void[]) {
  const finish = Date.now();
  let fileCount = 0;
  for (const item of uploads) {
    fileCount += 1;
  }
  const duration = finish - begin;
  console.log(
    `Uploaded ${fileCount} files. It took ${(duration / 1000).toFixed(3)} seconds.`
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

    const mapper = async (fileSpec: UploadSpecification) => {
      try {
        // Check if bucket exists before upload
        const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
        const s3Client = new S3Client({
          forcePathStyle: true,
          endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
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

        await uploadObjectToS3(
          {
            Body: fs.createReadStream(fileSpec.absoluteFilePath),
            Bucket: bucket,
            Key: encodedKey,
          },
          core
        );

        core.debug(`Successfully uploaded ${fileSpec.uploadFilePath}`);
      } catch (error) {
        core.error(`Error uploading ${fileSpec.uploadFilePath}: ${error}`);
        throw error;
      }
    };

    const result = await pMap(uploadSpec, mapper, { concurrency });
    logUploadInformation(startTime, result);
    return result;

  } catch (error) {
    core.setFailed(`An error was encountered when uploading ${artifactName}: ${error}`);
    throw error;
  }
}