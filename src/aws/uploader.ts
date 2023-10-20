import {type UploadOptions} from "@actions/artifact";
import {UploadResponse} from "@actions/artifact/lib/internal/upload-response";
import {uploadObjectToS3} from "./put-data-s3";
import fs from "node:fs";
import * as core from "@actions/core";
import {getUploadSpecification} from "../upload-specification";

export async function uploadArtifact(
    artifactName: string,
    filesToUpload: string[],
    rootDirectory: string,
    options: UploadOptions,
    bucket: string,
): Promise<UploadResponse> {
    const uploadResponse: UploadResponse = {
        artifactName: artifactName,
        artifactItems: [],
        size: -1,
        failedItems: [],
    }

	const uploadSpec = getUploadSpecification(artifactName, rootDirectory, filesToUpload);

    for (const fileSpec of uploadSpec) {
        try {
            await uploadObjectToS3({
                Body: fs.createReadStream(fileSpec.absoluteFilePath),
                Bucket: bucket,
                Key: `ci-pipeline-upload-artifacts/aaa/${fileSpec.uploadFilePath}`,  // TODO: fix path
            }, core)
        } catch (err) {
            uploadResponse.failedItems.push(fileSpec.absoluteFilePath)
        }
    }
    return uploadResponse;
}
