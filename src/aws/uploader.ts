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

  let newFileList: UploadSpecification[] = []

  for (const fileSpec of uploadSpec) {
    newFileList.push(fileSpec)
  }

  const mapper = async thisFileSpec => {
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
      core.setFailed(
        `An error was encountered when uploading ${thisFileSpec.artifactName}`
      )
    }
  }

  // use p-map to make the uploads run concurrently
  const result = await pMap(newFileList, mapper)
  return result
}
