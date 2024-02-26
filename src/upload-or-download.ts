import {runDownload} from './aws/downloader'
import {getInputs} from './input-helper'
import {runUpload} from './upload-artifact'

if (getInputs().UploadOrDownload == 'upload') {
  console.log('Starting upload...')
  runUpload()
} else if (getInputs().UploadOrDownload == 'download') {
  console.log('Starting download...')
  runDownload()
} else {
  console.log('No input found for UploadOrDownload.')
}
