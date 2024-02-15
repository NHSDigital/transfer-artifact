import * as core from '@actions/core'
import { parse } from 'node:path';
import { json } from 'stream/consumers';
import {Inputs, NoFileOptions} from './constants'
import {UploadInputs} from './upload-inputs'

function raiseError(errorMessage: string): never {
  throw new Error(errorMessage);
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  const name = core.getInput(Inputs.Name)
  const path = core.getInput(Inputs.Path, {required: true})
  const bucket = core.getInput(Inputs.ArtifactBucket) || process.env.ARTIFACTS_S3_BUCKET || raiseError('no artifact-bucket supplied');
  const UploadOrDownload = core.getInput(Inputs.UploadOrDownload)
  const ci_pipeline_iid = process.env.CI_PIPELINE_IID || raiseError('no ci_pipeline_iid supplied');

  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound)
  const noFileBehavior: NoFileOptions = NoFileOptions[ifNoFilesFound]

  if (!noFileBehavior) {
    core.setFailed(
      `Unrecognized ${
        Inputs.IfNoFilesFound
      } input. Provided: ${ifNoFilesFound}. Available options: ${Object.keys(
        NoFileOptions
      )}`
    )
  }

  const inputs = {
    artifactName: name,
    artifactBucket: bucket,
    searchPath: path,
    ifNoFilesFound: noFileBehavior,
    UploadOrDownload: UploadOrDownload,
    ci_pipeline_iid: ci_pipeline_iid
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
