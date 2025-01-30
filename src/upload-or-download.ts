import { runDownload } from './aws/downloader';
import { getInputs } from './input-helper';
import { runUpload } from './upload-artifact';

async function main() {
  try {
    const inputs = getInputs();
    const direction = inputs.direction;

    if (direction === 'upload') {
      console.log('Starting upload...');
      await runUpload();
    } else if (direction === 'download') {
      console.log('Starting download...');
      await runDownload();
    } else {
      throw new Error(
        'No input found for direction. Please specify "upload" or "download".'
      );
    }
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
    process.exit(1);
  }
}

// Execute the main function
main();
