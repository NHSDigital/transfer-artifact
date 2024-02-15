import {NoFileOptions, UploadOrDownloadOptions} from './constants'

export interface UploadInputs {
  /**
   * The name of the artifact that will be uploaded
   */
  artifactName: string

  /**
   * The S3 bucket to upload to
   */
  artifactBucket: string

  /**
   * The search path used to describe what to upload as part of the artifact
   */
  searchPath: string

  /**
   * The desired behavior if no files are found with the provided search path
   */
  ifNoFilesFound: NoFileOptions

  /**
   * Duration after which artifact will expire in days
   */
  retentionDays: number

    /**
   * Whether to upload to S3, or download from S3
   */
  UploadOrDownload: UploadOrDownloadOptions

      /**
   * The pipeline ID, used to download only the correct artifact from S3
   */
  ci_pipeline_iid: string 
}
