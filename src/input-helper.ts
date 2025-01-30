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
  // Get required inputs with defaults matching action.yml
  const path = core.getInput(Inputs.Path, { required: true }) || './';

  // Get other inputs with their defaults
  const name =
    core.getInput(Inputs.FolderName) ||
    process.env.INPUT_NAME ||
    'upload-artifacts';

  const bucket =
    core.getInput(Inputs.ArtifactBucket) ||
    process.env.ARTIFACTS_S3_BUCKET ||
    process.env.INPUT_ARTIFACT_BUCKET ||
    raiseError('no artifact-bucket supplied');

  const direction =
    core.getInput(Inputs.Direction) || process.env.INPUT_DIRECTION || 'upload';

  const runNumber =
    core.getInput(Inputs.RunNumber) || process.env.GITHUB_RUN_NUMBER || '';

  const concurrency = parseInt(core.getInput(Inputs.Concurrency) || '8');

  // Handle if-no-files-found setting with validation
  const ifNoFilesFound =
    core.getInput(Inputs.IfNoFilesFound) ||
    process.env.INPUT_IF_NO_FILES_FOUND ||
    'warn';

  if (!['warn', 'error', 'ignore'].includes(ifNoFilesFound)) {
    core.setFailed(
      `Unrecognized if-no-files-found input. Provided: ${ifNoFilesFound}. Available options: warn, error, ignore.`
    );
  }

  // Generate artifact name from run number and folder name
  const artifactName = runNumber ? `${runNumber}-${name}` : name;

  const inputs: UploadInputs = {
    artifactName,
    artifactBucket: bucket,
    searchPath: path,
    ifNoFilesFound,
    direction,
    folderName: name,
    concurrency,
  };

  // Handle retention days if specified
  const retentionDaysStr =
    core.getInput(Inputs.RetentionDays) || process.env.INPUT_RETENTION_DAYS;
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
