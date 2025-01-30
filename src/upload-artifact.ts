import * as core from '@actions/core';
import { getInputs } from './input-helper';
import { findFilesToUpload } from './search';
import { uploadArtifact } from './aws/uploader';

export async function runUpload(): Promise<void> {
  const inputs = getInputs();
  core.info(`Starting upload for ${inputs.artifactName}...`);

  try {
    const searchResult = await findFilesToUpload(inputs.searchPath);

    if (searchResult.filesToUpload.length === 0) {
      if (inputs.ifNoFilesFound === 'error') {
        throw new Error(
          `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
        );
      } else if (inputs.ifNoFilesFound === 'warn') {
        core.warning(
          `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
        );
      }
      return;
    }

    const uploadResponse = await uploadArtifact(
      inputs.artifactName,
      searchResult.filesToUpload,
      searchResult.rootDirectory,
      {}, // Empty options object
      inputs.artifactBucket,
      inputs.folderName,
      inputs.concurrency || 8 // Default to 8 if not specified
    );

    if (!uploadResponse) {
      core.setFailed(`Failed to upload ${inputs.artifactName}`);
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}
