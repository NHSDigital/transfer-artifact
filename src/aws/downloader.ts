import * as core from '@actions/core';
import fs from 'node:fs/promises';
import { getInputs } from '../input-helper';
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import pMap from 'p-map';
import * as path from 'path';

/* Get the path to the file, including the filename and ending.
  Exclude the prefix which has been used to find the item in S3 */

export function getPathToItem(fullName: string, prefix: string) {
  // return fullName.split(prefix+'/')[1]
  // console.log(`I am fullName.indexOf(prefix) + prefix.length: ${fullName.indexOf(prefix) + prefix.length}`)
  // return fullName.indexOf(prefix) + prefix.length
  const lastCharacterOfPrefix=fullName.indexOf(prefix) + prefix.length
  console.log(`I am lastCharacterOfPrefix: ${lastCharacterOfPrefix}`)
  var nameAfterPrefix=fullName.substring(lastCharacterOfPrefix)
  console.log(`I am nameAfterPrefix 1: ${nameAfterPrefix}`)
  // if there is a / at the beginning of the name, clip it off
  if(nameAfterPrefix.charAt(0)=='/'){
    nameAfterPrefix=nameAfterPrefix.substring(1)
  }
  console.log(`I am nameAfterPrefix 2: ${nameAfterPrefix}`)
  return nameAfterPrefix
}

function logDownloadInformation(begin: number, downloads: number[]) {
  const finish = Date.now();
  let fileCount = 0;
  let byteCount = 0;
  for (const fileSize of downloads) {
    byteCount += fileSize;
    fileCount += 1;
  }
  const duration = finish - begin;
  const rate = byteCount / duration;
  console.log(
    `Downloaded ${byteCount} bytes, in ${fileCount} files. It took ${(
      duration / 1000
    ).toFixed(3)} seconds at a rate of ${rate.toFixed(0)} KB/s`
  );
}

export async function runDownload(): Promise<any> {
  try {
    const startTime = Date.now();
    const inputs = getInputs();
    const bucket = inputs.artifactBucket;
    const name = inputs.artifactName;
    const concurrency = inputs.concurrency;
    const downloadFolder = inputs.searchPath;
    const folderName = inputs.folderName;

    const objectList = await listS3Objects({
      Bucket: bucket,
      Prefix: `ci-pipeline-upload-artifacts/${folderName}/${name}`
    });

    let newObjectList: string[] = [];

    // listS3Objects brings back everything in the S3 bucket
    // use an if statement to find only files relevant to this pipeline

    for (const item of objectList) {
      if (item.includes(name)) {
        const fileName = path.join(downloadFolder, getPathToItem(item, name));
        const folderName = path.dirname(fileName);
        // create a folder to hold the downloaded objects
        // add { recursive: true } to continue without error if the folder already exists
        await fs.mkdir(folderName, { recursive: true });
        newObjectList.push(item);
      }
    }

    const mapper = async (artifactPath: string) => {
      const downloadLocation = path.join(
        downloadFolder,
        getPathToItem(artifactPath, name)
      );
      const getFiles = await writeS3ObjectToFile(
        {
          Bucket: bucket,
          Key: artifactPath,
        },
        downloadLocation
      );
      console.log(
        `Item downloaded: ${artifactPath} downloaded to ${downloadLocation}`
      );
      return getFiles;
    };

    const result = await pMap(newObjectList, mapper, {
      concurrency: concurrency,
    });

    logDownloadInformation(startTime, result);

    console.log(`Total objects downloaded: ${newObjectList.length}`);

    return result;
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}
