import { runDownload } from './aws/downloader';
import {getInputs} from './input-helper';
import { runUpload } from './upload-artifact';

if (getInputs().UploadOrDownload=='upload'){
    console.log('I am calling runUpload()')
    runUpload()
}

if (getInputs().UploadOrDownload=='download'){
    console.log('I am calling runDownload()')
    runDownload()
}
