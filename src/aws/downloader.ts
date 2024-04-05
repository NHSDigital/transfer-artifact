import * as core from '@actions/core';
import fs from 'node:fs/promises';
import { getInputs } from '../input-helper';
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import pMap from 'p-map';

// used for getting the name of the item, which is the last part of the file path
function getItemName(str: string) {
  const splitString = str.split('/');
  return splitString[splitString.length - 1];
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
    // 2009 - try trimming off the . at the beginning
    const downloadPath = inputs.searchPath.replace('./','');
    const folderName = inputs.folderName

    console.log(`I am inputs: ${JSON.stringify(getInputs())}`)

    // create a folder to hold the downloaded objects
    // add { recursive: true } to continue without error if the folder already exists
    // fs.mkdir(downloadFolderName, { recursive: true} )
    fs.mkdir(downloadPath, { recursive: true} )
    console.log(`I have made a path: ${downloadPath}`)

    console.log('I am reading from __dirname:')
    fs.readdir(__dirname)

    const objectList = await listS3Objects({
      Bucket: bucket,
      Prefix: name,
    });

    let newObjectList: string[] = [];

    // listS3Objects brings back everything in the S3 bucket
    // use an if statement to find only files relevant to this pipeline

    for (const item of objectList) {

      // const newFilename = getItemName(item);

      const newFilename = downloadPath.concat('/',item)
      
      if (item.includes(name)) {
        newObjectList.push(item);
        fs.writeFile(newFilename, '');
        console.log(`I am newFilename: ${newFilename}`)
      }
    }

    console.log(`I am downloadPath.concat('/',getItemName(name)): ${downloadPath.concat('/',getItemName(name))}`)
    console.log(`I am downloadPath.concat('/ci-pipeline-upload-artifacts',getItemName(name)): ${downloadPath.concat('/ci-pipeline-upload-artifacts',getItemName(name))}`)
    console.log(`I am downloadPath.concat('/ci-pipeline-upload-artifacts',getItemName(name)): ${downloadPath.concat('/ci-pipeline-upload-artifacts',folderName,'/',getItemName(name))}`)


    const mapper = async (artifactPath: string) => {
      const getFiles = await writeS3ObjectToFile(
        {
          Bucket: bucket,
          Key: artifactPath,
        },
        // downloadPath.concat('/',getItemName(artifactPath))
        downloadPath.concat('/',)

      );
      console.log(`Item downloaded: ${artifactPath}`);
      return getFiles;
    };

    const result = await pMap(newObjectList, mapper, {concurrency: concurrency});

    logDownloadInformation(startTime, result);

    console.log(`Total objects downloaded: ${newObjectList.length}`);

    return result;
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}
