import * as core from '@actions/core'
import {Inputs} from './constants'
import {UploadInputs} from './upload-inputs'

function raiseError(errorMessage: string): never {
  throw new Error(errorMessage)
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  // const name = core.getInput(Inputs.Name)
  const name = (core.getInput(Inputs.FolderName),"-",core.getInput(Inputs.FolderName)).concat()
  console.log(`I am name: ${name}`)
  const path = core.getInput(Inputs.Path, {required: true})
  const bucket =
    core.getInput(Inputs.ArtifactBucket) ||
    process.env.ARTIFACTS_S3_BUCKET ||
    raiseError('no artifact-bucket supplied')
  const direction = core.getInput(Inputs.Direction)

  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound)
  const noFileBehavior = ifNoFilesFound

  const folderName = core.getInput(Inputs.FolderName)

  const concurrency = core.getInput(Inputs.Concurrency)

  if (!noFileBehavior) {
    core.setFailed(
      `Unrecognized ${Inputs.IfNoFilesFound} input. Provided: ${ifNoFilesFound}. Available options: warn, error, ignore.`
    )
  }

  const inputs = {
    artifactName: name,
    artifactBucket: bucket,
    searchPath: path,
    ifNoFilesFound: noFileBehavior,
    direction: direction,
    folderName: folderName
  } as UploadInputs

  const retentionDaysStr = core.getInput(Inputs.RetentionDays)
  if (retentionDaysStr) {
    inputs.retentionDays = parseInt(retentionDaysStr)
    if (isNaN(inputs.retentionDays)) {
      core.setFailed('Invalid retention-days')
    }
  }

  return inputs
}
