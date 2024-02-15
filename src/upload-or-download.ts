import { runDownload } from './aws/downloader';
import {getInputs} from './input-helper';
import { runUpload } from './upload-artifact';

if (getInputs().UploadOrDownload=='upload'){
    console.log('Calling runUpload()...')
    runUpload()
}

if (getInputs().UploadOrDownload=='download'){
    console.log('Calling runDownload()...')
    runDownload()
}
