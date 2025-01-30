import * as core from '@actions/core';
import { Inputs } from './constants';
import { UploadInputs } from './upload-inputs';

function raiseError(errorMessage: string): never {
  throw new Error(errorMessage);
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  // Get required inputs
  const path = core.getInput(Inputs.Path, { required: true });

  // Get other inputs
  const bucket =
    core.getInput(Inputs.ArtifactBucket) ||
    process.env.ARTIFACTS_S3_BUCKET ||
    raiseError('no artifact-bucket supplied');

  const runNumber = core.getInput(Inputs.RunNumber);
  const folderName = core.getInput(Inputs.FolderName) || 'upload-artifacts';
  const direction = core.getInput(Inputs.Direction) || 'upload';

  // Handle if-no-files-found setting with validation
  const ifNoFilesFound = core.getInput(Inputs.IfNoFilesFound) || 'warn';
  if (!['warn', 'error', 'ignore'].includes(ifNoFilesFound)) {
    core.setFailed(
      `Unrecognized if-no-files-found input. Provided: ${ifNoFilesFound}. Available options: warn, error, ignore.`
    );
    // Allow execution to continue after setting failed status
  }

  // Generate artifact name
  const name = runNumber ? `${runNumber}-${folderName}` : folderName;

  const inputs: UploadInputs = {
    artifactName: name,
    artifactBucket: bucket,
    searchPath: path,
    ifNoFilesFound: ifNoFilesFound,
    direction: direction,
    folderName: folderName,
    concurrency: 8, // Default concurrency
  };

  // Handle retention days if specified
  const retentionDaysStr = core.getInput(Inputs.RetentionDays);
  if (retentionDaysStr) {
    const retentionDays = parseInt(retentionDaysStr);
    if (isNaN(retentionDays)) {
      core.setFailed('Invalid retention-days');
    } else {
      inputs.retentionDays = retentionDays;
    }
  }

  return inputs;
}
