/* eslint-disable no-unused-vars */
export enum Inputs {
  Name = 'name',
  Path = 'path',
  IfNoFilesFound = 'if-no-files-found',
  RetentionDays = 'retention-days',
  ArtifactBucket = 'artifact-bucket',
  UploadOrDownload = 'upload-or-download'
}

export enum UploadOrDownloadOptions {
  upload = 'upload',
  download = 'download'
}

export enum NoFileOptions {
  /**
   * Default. Output a warning but do not fail the action
   */
  warn = 'warn',

  /**
   * Fail the action with an error message
   */
  error = 'error',

  /**
   * Do not output any warnings or errors, the action does not fail
   */
  ignore = 'ignore'
}
