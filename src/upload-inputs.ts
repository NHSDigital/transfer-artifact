export interface UploadInputs {
  artifactName: string;
  searchPath: string;
  artifactBucket: string;
  ifNoFilesFound: string;
  retentionDays?: number;
  direction: string;
  folderName: string;
  concurrency: number; // Required with default value
}
