import {type UploadOptions} from '@actions/artifact'
import {UploadResponse} from '@actions/artifact/lib/internal/upload-response'
import {uploadObjectToS3} from './put-data-s3'
import fs from 'node:fs'
import * as core from '@actions/core'
import {
  getUploadSpecification,
  UploadSpecification
} from '../upload-specification'
import pMap from 'p-map'

export async function uploadArtifact(
  artifactName: string,
  filesToUpload: string[],
  rootDirectory: string,
  options: UploadOptions,
  bucket: string
  // 2009 - Promise<any> is bad form!
  // returns a void
): Promise<any> {
  const startTime = Date.now()
  // const uploadResponse: UploadResponse = {
  //   artifactName: artifactName,
  //   artifactItems: [],
  //   size: -1,
  //   failedItems: []
  // }

  const uploadSpec:UploadSpecification[] = getUploadSpecification(
    artifactName,
    rootDirectory,
    filesToUpload
  )

  const mapper = async (fileSpec:UploadSpecification) => {
    try {
      await uploadObjectToS3(
        {
          Body: fs.createReadStream(fileSpec.absoluteFilePath),
          Bucket: bucket,
          Key: `ci-pipeline-upload-artifacts/${fileSpec.uploadFilePath}` // TODO: fix path
        },
        core
      )
    } catch {
      core.setFailed(
        `An error was encountered when uploading ${artifactName}`
      )
    }
  }

  // use p-map to make the uploads run concurrently
  const result = await pMap(uploadSpec, mapper)

  // log information about the downloads
  const finishTime = Date.now()
  let fileCount = 0
  for (const item of result){
    // byteCount += fileSize
    fileCount += 1
  }
  const duration = finishTime - startTime
  console.log(
    `Uploaded ${fileCount} files. It took ${( duration / 1000 ).toFixed(3)} seconds.`
  )

  return result
}
