/* eslint-disable no-unused-vars */
export enum Inputs {
  Path = 'path',
  ArtifactBucket = 'artifact-bucket',
  IfNoFilesFound = 'if-no-files-found',
  RetentionDays = 'retention-days',
  Direction = 'direction',
  FolderName = 'name',
  RunNumber = 'run-number',
  Concurrency = 'concurrency',
}

export type DirectionOptions = 'upload' | 'download';
