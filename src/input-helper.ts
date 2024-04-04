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
  // generate a name for the artifact sub-folder which includes the github run number
  const name = (core.getInput(Inputs.RunNumber)).concat("-",core.getInput(Inputs.FolderName))
  const path = core.getInput(Inputs.Path, {required: true})
  const bucket =
    core.getInput(Inputs.ArtifactBucket) ||
    process.env.ARTIFACTS_S3_BUCKET ||
    raiseError('no artifact-bucket supplied')
  const direction = core.getInput(Inputs.Direction)

  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound)
  const noFileBehavior = ifNoFilesFound

  // 2009 - rename to uploadFolderName
  // also rename UploadInputs
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
