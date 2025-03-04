import {
  DefaultArtifactClient,
  type UploadArtifactOptions,
} from '@actions/artifact';
import * as core from '@actions/core';

import { uploadArtifact } from './aws/uploader';
import { getInputs } from './input-helper';
import { findFilesToUpload } from './search';

export async function runUpload(): Promise<void> {
  try {
    const inputs = getInputs();
    const searchResult = await findFilesToUpload(inputs.searchPath);

    if (searchResult.filesToUpload.length === 0) {
      // No files were found, different use cases warrant different types of behavior if nothing is found
      switch (inputs.ifNoFilesFound) {
        case 'warn': {
          core.warning(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          );
          break;
        }
        case 'error': {
          core.setFailed(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          );
          break;
        }
        case 'ignore': {
          core.info(
            `No files were found with the provided path: ${inputs.searchPath}. No artifacts will be uploaded.`
          );
          break;
        }
      }
    } else {
      const s = searchResult.filesToUpload.length === 1 ? '' : 's';
      core.info(
        `With the provided path, there will be ${searchResult.filesToUpload.length} file${s} uploaded`
      );
      core.debug(`Root artifact directory is ${searchResult.rootDirectory}`);

      if (searchResult.filesToUpload.length > 10000) {
        core.warning(
          `There are over 10,000 files in this artifact, consider creating an archive before upload to improve the upload performance.`
        );
      }

      const artifactClient = new DefaultArtifactClient();

      const options: UploadArtifactOptions = {};
      if (inputs.retentionDays) {
        options.retentionDays = inputs.retentionDays;
      }

      core.info(
        `Trying to upload files into ${inputs.folderName}/${inputs.artifactName}...`
      );

      const useS3 = true;
      if (useS3) {
        await uploadArtifact(
          inputs.artifactName,
          searchResult.filesToUpload,
          searchResult.rootDirectory,
          options,
          inputs.artifactBucket,
          inputs.folderName,
          inputs.concurrency
        );
      } else {
        await artifactClient.uploadArtifact(
          inputs.artifactName,
          searchResult.filesToUpload,
          searchResult.rootDirectory,
          options
        );
      }
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}
