import * as core from '@actions/core';
import { Inputs } from './constants';
import { UploadInputs } from './upload-inputs';

function raiseError(errorMessage: string): never {
  throw new Error(errorMessage);
}

/**
 * Gets input with proper precedence: core.getInput -> ENV -> default
 */
function getActionInput(name: string, defaultValue: string = ''): string {
  const inputName = name.replace(/-/g, '_').toUpperCase();
  return (
    core.getInput(name) || process.env[`INPUT_${inputName}`] || defaultValue
  );
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  // Get required inputs with defaults matching action.yml
  const path = getActionInput(Inputs.Path) || './';

  // Get the bucket with special env var handling
  const bucket =
    getActionInput(Inputs.ArtifactBucket) ||
    process.env.ARTIFACTS_S3_BUCKET ||
    raiseError('no artifact-bucket supplied');

  const name = getActionInput(Inputs.FolderName, 'upload-artifacts');
  const direction = getActionInput(Inputs.Direction, 'upload');
  const runNumber =
    getActionInput(Inputs.RunNumber) || process.env.GITHUB_RUN_NUMBER || '';
  const concurrency = parseInt(getActionInput(Inputs.Concurrency, '8'));

  // Handle if-no-files-found setting with validation
  const ifNoFilesFound = getActionInput(Inputs.IfNoFilesFound, 'warn');
  const validOptions = ['warn', 'error', 'ignore'];

  if (!validOptions.includes(ifNoFilesFound)) {
    throw new Error(
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
  const retentionDaysStr = getActionInput(Inputs.RetentionDays);
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
