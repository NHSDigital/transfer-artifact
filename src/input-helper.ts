import * as core from '@actions/core';
import { Inputs } from './constants';
import { UploadInputs } from './upload-inputs';

function raiseError(errorMessage: string): never {
  throw new Error(errorMessage);
}

/**
 * Gets input with proper precedence: command line args -> core.getInput -> ENV -> default
 */
function getActionInput(name: string, defaultValue: string = ''): string {
  const cliArgName = `--${name}`;
  const envName = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;

  // Check command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    // Handle --name=value format
    if (args[i].startsWith(`${cliArgName}=`)) {
      return args[i].split('=')[1];
    }
    // Handle --name value format
    if (args[i] === cliArgName && i + 1 < args.length) {
      return args[i + 1];
    }
  }

  // Check core.getInput and environment variables
  const coreInput = core.getInput(name);
  if (coreInput) {
    return coreInput;
  }

  const envInput = process.env[envName];
  if (envInput) {
    return envInput;
  }

  return defaultValue;
}

/**
 * Helper to get all the inputs for the action
 */
export function getInputs(): UploadInputs {
  // Get the path first
  const path = getActionInput(Inputs.Path) || raiseError('no path supplied');

  // Get the bucket with special env var handling
  const bucket = getActionInput(Inputs.ArtifactBucket) ||
                process.env.ARTIFACTS_S3_BUCKET ||
                raiseError('no artifact-bucket supplied');

  const name = getActionInput(Inputs.FolderName, 'upload-artifacts');
  const direction = getActionInput(Inputs.Direction, 'upload');
  const runNumber = getActionInput(Inputs.RunNumber) || process.env.GITHUB_RUN_NUMBER || '';
  const concurrency = parseInt(getActionInput(Inputs.Concurrency, '8'));

  // Handle if-no-files-found setting with validation
  const ifNoFilesFound = getActionInput(Inputs.IfNoFilesFound, 'warn');
  const validOptions = ['warn', 'error', 'ignore'];

  if (!validOptions.includes(ifNoFilesFound)) {
    throw new Error(
      `Unrecognized if-no-files-found input. Provided: ${ifNoFilesFound}. Available options: warn, error, ignore.`
    );
  }

  // Generate artifact name
  const artifactName = runNumber ? `${runNumber}-${name}` : name;

  const inputs: UploadInputs = {
    artifactName,
    artifactBucket: bucket,
    searchPath: path,
    ifNoFilesFound,
    direction,
    folderName: name,
    concurrency
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