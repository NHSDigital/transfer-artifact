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
    `Uploaded ${fileCount} files. It took ${(duration / 1000).toFixed(
      3
    )} seconds.`
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
  // the p-map does all the work and then returns a null array
): Promise<any> {
  const startTime = Date.now();

  const uploadSpec: UploadSpecification[] = getUploadSpecification(
    artifactName,
    rootDirectory,
    filesToUpload
  );

  const mapper = async (fileSpec: UploadSpecification) => {
    try {
      await uploadObjectToS3(
        {
          Body: fs.createReadStream(fileSpec.absoluteFilePath),
          Bucket: bucket,
          Key: `${folderName}/${fileSpec.uploadFilePath}`, // TODO: fix path
        },
        core
      );
    } catch {
      core.setFailed(`An error was encountered when uploading ${artifactName}`);
    }
  };

  const result = await pMap(uploadSpec, mapper, {concurrency: concurrency});

  logUploadInformation(startTime, result);

  return result;
}
