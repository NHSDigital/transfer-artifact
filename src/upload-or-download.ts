import { runDownload } from './aws/downloader';
import { getInputs } from './input-helper';
import { runUpload } from './upload-artifact';

const direction = getInputs().direction;

if (direction === 'upload') {
  console.log('Starting upload...');
  runUpload().then(() => console.log('Upload completed!'));
} else if (direction === 'download') {
  console.log('Starting download...');
  runDownload().then(() => console.log('Download completed!'));
} else {
  console.log(
    'No input found for direction.  Please specify "upload" or "download".'
  );
}
