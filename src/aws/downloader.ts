import * as core from '@actions/core';
// import fs from 'node:fs/promises';
import fs from 'node:fs'
import { getInputs } from '../input-helper';
import { listS3Objects, writeS3ObjectToFile } from './get-object-s3';
import pMap from 'p-map';
import { PathLike } from 'node:fs';

// used for getting the name of the item, which is the last part of the file path
function getItemName(str: string) {
  const splitString = str.split('/');
  console.log(`I am splitString[splitString.length - 1] for getItemName: ${splitString[splitString.length - 1]}`)
  return splitString[splitString.length - 1];
}

function getPathToItem(str:string, name:string){
  const splitToGetPath = str.substring(str.indexOf(name)+name.length+1)
  console.log(`I am splitToGetPath in getPathToItem: ${splitToGetPath}`)
  return splitToGetPath
}

function getItemPath(path: string) {
  // const getPath = path.replace(file,'')
  // console.log(`I am getPath in getItemPath: ${getPath}`)
  // return getPath as PathLike
  const pathWithoutZipAtEnd = path.slice(0,path.lastIndexOf('/'))
  console.log(`I am pathWithoutZipAtEnd in getItemPath: ${pathWithoutZipAtEnd}`)
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
    // 2009 - use path concatenation???
    const downloadPath = inputs.searchPath;
    const folderName = inputs.folderName

    // create a folder to hold the downloaded objects
    // add { recursive: true } to continue without error if the folder already exists

    // 2009 - check where I actually am!!
    // 2009 - could it be a sync issue??? use a promise???

    const objectList = await listS3Objects({
      Bucket: bucket,
      Prefix: `ci-pipeline-upload-artifacts/${folderName}/${name}`
    });

    let newObjectList: string[] = [];

    console.log(`I am objectList: ${objectList}`)

    // listS3Objects brings back everything in the S3 bucket
    // use an if statement to find only files relevant to this pipeline

    for (const item of objectList) {

      if (item.includes(name)) {
        console.log(`I am getPathToItem: ${getPathToItem(item,name)}`)

        console.log(`I am getItemPath: ${getItemPath(getPathToItem(item,name))}`)
  
        const newFilename = downloadPath.concat('/', getItemName(item));
  
        console.log(`I am newFilename: ${newFilename}`)

        const updatedFolderName = downloadPath.concat('/',getItemPath(getPathToItem(item,name)))
        const updatedFileName = updatedFolderName.concat('/',getItemName(item))
        console.log(`I am trying to create a new directory at ${updatedFileName}...`)
        fs.mkdirSync(updatedFolderName, {recursive:true})
        // du bash command recursively
        // at the download path folder
        // or go into pipeline and look in docker image???
        // check structure of updated folder name (absolute path? relative?)
        // console.log(`Checking for access to ${updatedFolderName}`)
        // fs.access(updatedFolderName)
        // fs.chmod(updatedFolderName,fs.constants.S_IWOTH)
        console.log(`New directory created at ${updatedFolderName}.  Trying to write to file at ${updatedFileName}...`)
        fs.writeFileSync(updatedFileName,'')
        console.log('I have written to updated file name')
        newObjectList.push(item);
        fs.writeFileSync(newFilename, '');
        console.log(`I have written file to newFilename, ${newFilename}`)
      }
    }

    console.log(`I have completed all steps in for const item of itemlist`)

    const mapper = async (artifactPath: string) => {
      const getFiles = await writeS3ObjectToFile(
        {
          Bucket: bucket,
          Key: artifactPath,
        },
        // downloadPath.concat('/', getItemName(artifactPath))
        downloadPath.concat('/',getItemPath(getPathToItem(artifactPath,name)),'/',getItemName(artifactPath))
      );
      console.log(
        // `Item downloaded: ${artifactPath} downloaded to 
        //   ${downloadPath.concat(
        //   '/',
        //   getItemName(artifactPath)
        // )}`
        `Item downloaded: ${artifactPath} downloaded to ${downloadPath.concat('/',getItemPath(getPathToItem(artifactPath,name)),'/',getItemName(artifactPath))}`
      );
      return getFiles;
    };

    // 2009 - issue is here, it doesn't seem to be able to find the file (even though it has already been created above)
    // const mapper = async (artifactPath: string) => {
    //   const starterFileLocation = getItemName(artifactPath)
    //   const newFileLocation = downloadPath.concat('/', getPathToItem(artifactPath,name))
    //   const getFiles = await writeS3ObjectToFile(
    //     {
    //       Bucket: bucket,
    //       Key: artifactPath,
    //     },
    //     starterFileLocation
    //   );
    //   console.log(`I am newFileLocation: ${newFileLocation}`)
    //   fs.writeFile(newFileLocation, '');
    //   console.log(
    //     `Item downloaded: ${artifactPath} downloaded to ${starterFileLocation}`
    //   );
    //   console.log(`I am checking I have access...`)
    //   fs.access(starterFileLocation)
    //   fs.access(newFileLocation)
    //   console.log(`I am trying to move the file to its final location...`)
    //   fs.copyFile(starterFileLocation,newFileLocation)
    //   console.log(`File successfully moved to newFileLocation, ${newFileLocation}`)
    //   return getFiles;
    // };

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
