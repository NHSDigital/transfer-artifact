import * as core from '@actions/core';
import fs from 'node:fs/promises';
import os, { homedir } from 'node:os';
import {getInputs} from '../input-helper';
import {listS3Objects} from "../aws";
import { getS3Object, writeS3ObjectToFile } from './get-object-s3';
import path from 'node:path';

export async function runDownload(): Promise<void> {
    try {
        console.log('I am running a download...')
        const inputs = getInputs();
        console.log('I am doing listS3Objects:')
        const bucket = inputs.artifactBucket;
        const name = inputs.artifactName;
        console.log(`I am name: ${name}`)
        const myList = await listS3Objects({
          Bucket: bucket,
          Key: path.join(bucket,'ci-pipeline-upload-artifacts/aaa',name)
        })
        console.log(`I am myList: ${myList}`)
        await fs.mkdir('./newDirectory')
        // NOTE TO SELF - this gets everything from every pipeline 
        // Instead I need just the things from THIS pipeline
        for(const item of myList){
          console.log(`I am item: ${item}`)
        console.log(`I am current files: ${await fs.readdir('./newDirectory')}`)
        const newFilename = path.join('./newDirectory', `temp.zip`);
        console.log(`I am newFilename: ${newFilename}`)
        fs.writeFile(newFilename,'')
        // console.log(`I am current files: ${await fs.readdir('./newDirectory')}`)
        await writeS3ObjectToFile(
              {
                Bucket: bucket,
                Key: `${item}`
              },
              newFilename
        )
        console.log('writeS3ObjectToFile done')
        // console.log(`I am current files: ${await fs.readdir('./newDirectory')}`)
        function getSecondPart(str) {
          return str.split('/dist/')[1];
        }
        const newNewFilename = getSecondPart(item)
        console.log('Trying to rename...')
        console.log(`I am newNewFilename: ${newNewFilename}`)
        fs.rename(newFilename,`./newDirectory/${newNewFilename}`)
        }
    console.log(`I am current files: ${await fs.readdir('./newDirectory')}`)
    } catch (error) {
        core.setFailed((error as Error).message)
      }
    }
