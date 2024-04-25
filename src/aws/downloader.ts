import * as core from '@actions/core';
import fs from 'node:fs/promises';
import { getInputs } from '../input-helper';
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import pMap from 'p-map';
import * as path from 'path';

// used for getting the entire path, including the file name and zip ending
function getPathToItem(str:string, name:string){
  const splitToGetPath = str.substring(str.indexOf(name)+name.length+1)
  return splitToGetPath
}

// used for getting the path, excluding the file itself
function getFolderForItem(path: string) {
  const pathWithoutZipAtEnd = path.slice(0,path.lastIndexOf('/'))
  return pathWithoutZipAtEnd
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
    const downloadPath = inputs.searchPath;
    const folderName = inputs.folderName

    const objectList = await listS3Objects({
      Bucket: bucket,
      Prefix: `ci-pipeline-upload-artifacts/${folderName}/${name}`
    });

    let newObjectList: string[] = [];

    // listS3Objects brings back everything in the S3 bucket
    // use an if statement to find only files relevant to this pipeline

    for (const item of objectList) {

      if (item.includes(name)) {
        const fileName = path.join(downloadPath,getPathToItem(item,name))
        const folderName = getFolderForItem(fileName)
        // create a folder to hold the downloaded objects
        // add { recursive: true } to continue without error if the folder already exists
        console.log('I am awaiting fs.mkdir...')
        await fs.mkdir(folderName, { recursive: true });
        // console.log('I am awaiting fs.writeFile...')
        // await fs.writeFile(fileName,'')

        newObjectList.push(item);
      }
    }

    const mapper = async (artifactPath: string) => {
      const downloadLocation = path.join(downloadPath,getPathToItem(artifactPath,name))
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
