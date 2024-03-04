import {type UploadOptions} from '@actions/artifact'
import {UploadResponse} from '@actions/artifact/lib/internal/upload-response'
import {uploadObjectToS3} from './put-data-s3'
import fs from 'node:fs'
import * as core from '@actions/core'
import {getUploadSpecification, UploadSpecification} from '../upload-specification'
import pMap from 'p-map'

export async function uploadArtifact(
  artifactName: string,
  filesToUpload: string[],
  rootDirectory: string,
  options: UploadOptions,
  bucket: string
// ): Promise<UploadResponse> {
  ): Promise<any> {
  const uploadResponse: UploadResponse = {
    artifactName: artifactName,
    artifactItems: [],
    size: -1,
    failedItems: []
  }

  const uploadSpec = getUploadSpecification(
    artifactName,
    rootDirectory,
    filesToUpload
  )

  let newFileList:UploadSpecification[] = []

  // 2009 - use pmap here
  for (const fileSpec of uploadSpec) {
    newFileList.push(fileSpec)
    // try {
    //   await uploadObjectToS3(
    //     {
    //       Body: fs.createReadStream(fileSpec.absoluteFilePath),
    //       Bucket: bucket,
    //       Key: `ci-pipeline-upload-artifacts/${fileSpec.uploadFilePath}` // TODO: fix path
    //     },
    //     core
    //   )
    // } catch (err) {
    //   uploadResponse.failedItems.push(fileSpec.absoluteFilePath)
    // }
  }

  const mapper = async thisFileSpec =>{
    try {
      await uploadObjectToS3(
                {
          Body: fs.createReadStream(thisFileSpec.absoluteFilePath),
          Bucket: bucket,
          Key: `ci-pipeline-upload-artifacts/${thisFileSpec.uploadFilePath}` // TODO: fix path
        },
        core
      )
    } catch {
      uploadResponse.failedItems.push(thisFileSpec.absoluteFilePath)
    }
  }

  // 2009 - look at concurrency
  const result = await pMap(newFileList,mapper,{concurrency:2})
  console.log(`I am newFileList: ${JSON.stringify(newFileList)}`)
  console.log(`I am result: ${JSON.stringify(result)}`)
  console.log(`I am result.keys: ${JSON.stringify(result.keys)}`)
  return result
  // return uploadResponse
}
