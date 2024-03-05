import * as core from '@actions/core'
import {create, UploadOptions} from '@actions/artifact'
import {findFilesToUpload} from './search'
import {getInputs} from './input-helper'
import {NoFileOptions} from './constants'
import {UploadResponse} from '@actions/artifact/lib/internal/upload-response'
import {uploadArtifact} from './aws/uploader'

export async function runUpload(): Promise<void> {
  try {
    const inputs = getInputs()
    const searchResult = await findFilesToUpload(inputs.searchPath)

    if (searchResult.filesToUpload.length === 0) {
      // No files were found, different use cases warrant different types of behavior if nothing is found
      switch (inputs.ifNoFilesFound) {
        case NoFileOptions.warn: {
          core.warning(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.error: {
          core.setFailed(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
        case NoFileOptions.ignore: {
          core.info(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          )
          break
        }
      }
    } else {
      const s = searchResult.filesToUpload.length === 1 ? '' : 's'
      core.info(
        `With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`
      )
      core.debug(`Root artifact directory is ${searchResult.rootDirectory}`)

      if (searchResult.filesToUpload.length > 10000) {
        core.warning(
          `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
        )
      }

      const artifactClient = create()
      const options: UploadOptions = {
        continueOnError: false
      }
      if (inputs.retentionDays) {
        options.retentionDays = inputs.retentionDays
      }

      core.info(
        `Uploading ${inputs.artifactName} with ${searchResult.filesToUpload}, ${searchResult.rootDirectory}, ${options}`
      )

      let uploadResponse: UploadResponse
      const useS3 = true
      if (useS3) {
        uploadResponse = await uploadArtifact(
          inputs.artifactName,
          searchResult.filesToUpload,
          searchResult.rootDirectory,
          options,
          inputs.artifactBucket
        )
      } else {
        uploadResponse = await artifactClient.uploadArtifact(
          inputs.artifactName,
          searchResult.filesToUpload,
          searchResult.rootDirectory,
          options
        )
      }
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}
