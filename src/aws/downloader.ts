import * as core from '@actions/core';
import fs from 'node:fs/promises';
import { getInputs } from '../input-helper';
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import pMap from 'p-map';
import { PathLike } from 'node:fs';

// used for getting the name of the item, which is the last part of the file path
function getItemName(str: string) {
  const splitString = str.split('/');
  return splitString[splitString.length - 1];
}

function getPathToItem(str:string, name:string){
  const splitToGetPath = str.substring(str.indexOf(name)+name.length+1)
  return splitToGetPath
}

function getItemPath(str: string, name:string) {
  const getPath = str.replace(name,'')
  return getPath as PathLike
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

    // create a folder to hold the downloaded objects
    // add { recursive: true } to continue without error if the folder already exists
    fs.mkdir(downloadPath, { recursive: true });

    const objectList = await listS3Objects({
      Bucket: bucket,
      Prefix: `ci-pipeline-upload-artifacts/${folderName}/${name}`
    });

    let newObjectList: string[] = [];

    console.log(`I am objectList: ${objectList}`)

    // listS3Objects brings back everything in the S3 bucket
    // use an if statement to find only files relevant to this pipeline

    for (const item of objectList) {
      const newFilename = downloadPath.concat('/', getItemName(item));

      // getPathToItem(item,name)

      // getItemPath(item,getItemName(item))

      // if (item.includes(name)) {
      //   console.log(`I am creating a new drive...`)
      //   // 2009 - try adding a require
      //   // var getDirName = require('path').dirname
      //   // const drive = getDirName(getItemPath(item,getItemName(item)))
      //   const drive = getItemPath(item,getItemName(item))
      //   fs.mkdir(drive,{recursive:true})
      //   // fs.mkdir(getItemPath(item,getItemName(item)),{recursive:true})
      //   newObjectList.push(item);
      //   // const testNewFilename = downloadPath.concat('/', getPathToItem(item,name))
      //   // console.log(`I am testNewFilename: ${testNewFilename}`)
      //   console.log(`I am newFilename: ${newFilename}`)
      //   console.log(`I am creating a new file...`)
      //   // fs.writeFile(testNewFilename, '');
      //   fs.writeFile(newFilename,'')
      //   console.log(`I'm done :)`)
      // }

      if (item.includes(name)) {
        newObjectList.push(item);
        fs.writeFile(newFilename, '');
        console.log(`I have written file to newFilename, ${newFilename}`)
      }
    }

    console.log(`I have completed all steps in for const item of itemlist`)

    // 2009 - issue is here, it doesn't seem to be able to find the file (even though it has already been created above)
    const mapper = async (artifactPath: string) => {
      const starterFileLocation = getItemName(artifactPath)
      const newFileLocation = downloadPath.concat('/', getPathToItem(artifactPath,name))
      const getFiles = await writeS3ObjectToFile(
        {
          Bucket: bucket,
          Key: artifactPath,
        },
        starterFileLocation
      );
      console.log(`I am newFileLocation: ${newFileLocation}`)
      fs.writeFile(newFileLocation, '');
      console.log(
        `Item downloaded: ${artifactPath} downloaded to ${starterFileLocation}`
      );
      console.log(`I am checking I have access...`)
      fs.access(starterFileLocation)
      fs.access(newFileLocation)
      console.log(`I am trying to move the file to its final location...`)
      fs.copyFile(starterFileLocation,newFileLocation)
      console.log(`File successfully moved to newFileLocation, ${newFileLocation}`)
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
