import * as core from '@actions/core'
import fs from 'node:fs/promises'
import {getInputs} from '../input-helper'
import {listS3Objects, writeS3ObjectToFile} from './get-object-s3'
import pMap from 'p-map'

// used for getting the name of the item, which is the last part of the file path
function getItemName(str) {
  const splitString = str.split('/')
  return splitString[splitString.length - 1]
}

// Promise<any> is bad form!!  Try something else
// function returns a null array
export async function runDownload(): Promise<any> {
  try {
    const startTime = Date.now()
    const inputs = getInputs()
    const bucket = inputs.artifactBucket
    const name = inputs.artifactName
    const pipeline_id = inputs.ci_pipeline_iid

    const objectList = await listS3Objects({
      Bucket: 'caas-pl-680509669821-eu-west-2-pl-mgmt-acct-cicd-temp-artifacts',
      Prefix: name
    })

    let newObjectList: string[] = []

    // these are the naming conventions for the uploaded files
    const regexForCDArtifacts = new RegExp('/pipeline_files/(.*).json')
    const regexForCIArtifacts = new RegExp(
      name + '(.*)/target/dist/NHSD.(.*).' + pipeline_id + '.zip'
    )

    // objectList brings back everything in the S3 bucket
    // use an if statement with the regex to find only files relevant to this pipeline
    for (const item of objectList) {
      if (regexForCIArtifacts.test(item) || regexForCDArtifacts.test(item)) {
        newObjectList.push(item)
        const newFilename = getItemName(item)
        fs.writeFile(newFilename, '')
      }
    }

    // this is the action to write the S3 object to file
    const mapper = async (artifactPath:string) => {
      const getFiles = await writeS3ObjectToFile(
        {
          Bucket: bucket,
          Key: artifactPath
        },
        getItemName(artifactPath)
      )
      console.log(`Item downloaded: ${artifactPath}`)
      return getFiles
    }

    // use p-map to make the downloads run concurrently
    // do the mapper function to everything in the array
    const result = await pMap(newObjectList, mapper)
    console.log(`Total objects downloaded: ${newObjectList.length}`)

    // log information about the downloads
    const finishTime = Date.now()
    let fileCount = 0
    let byteCount = 0
    for (const fileSize of result){
      byteCount += fileSize
      fileCount += 1
    }
    const duration = finishTime - startTime
    const rate = byteCount/duration
    console.log(
      `Downloaded ${byteCount} bytes, in ${fileCount} files. It took ${( duration / 1000 ).toFixed(3)} seconds That is ${rate.toFixed(0)} KB/s`
    )

    return result
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}
