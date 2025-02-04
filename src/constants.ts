export const Inputs = {
  RunNumber: 'run-number',
  Path: 'path',
  IfNoFilesFound: 'if-no-files-found',
  RetentionDays: 'retention-days',
  ArtifactBucket: 'artifact-bucket',
  Direction: 'direction',
  FolderName: 'name',
  Concurrency: 'concurrency',
};

export type DirectionOptions = 'upload' | 'download';

export type NoFileOptions =
  /**
   * Default. Output a warning but do not fail the action
   */
  | 'warn'

  /**
   * Fail the action with an error message
   */
  | 'error'

  /**
   * Do not output any warnings or errors, the action does not fail
   */
  | 'ignore';
