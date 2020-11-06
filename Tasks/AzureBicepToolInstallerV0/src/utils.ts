"use strict";

import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as os from 'os';
import * as path from "path";
import * as util from 'util';

export async function getBicepToolVersion(): Promise<string> {
    const version = tl.getInput("version");
    if (version && version !== "latest") {
        return sanitizeVersionString(version);
    }

    console.log(tl.loc("FindingLatestAzureBicepVersion"));
    const latestVersion =  await getLatestAzureBicepToolVersion();
    console.log(tl.loc("LatestAzureBicepVersion", latestVersion));
    return latestVersion;
}

export async function downloadAzureBicepTool(version: string): Promise<string> {
    return await downloadAzureBicepToolInternal(version);
}

// handle user input scenerios
function sanitizeVersionString(inputVersion: string) : string{
    const version = toolLib.cleanVersion(inputVersion);
    if(!version) {
        throw new Error(tl.loc("NotAValidSemverVersion"));
    }
    
    return version;
}

const bicepToolName = 'bicep';
const stableAzureBicepVersion = '0.1.226-alpha';

async function getLatestAzureBicepToolVersion(): Promise<string> {
    const azureBicepLatestReleaseUrl = 'https://api.github.com/repos/Azure/bicep/releases/latest';
    let latestVersion = stableAzureBicepVersion;

    try {
        const downloadPath = await toolLib.downloadTool(azureBicepLatestReleaseUrl);
        const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        if (response.tag_name) {
            latestVersion = response.tag_name;
        }
    } catch (error) {
        tl.warning(tl.loc('ErrorFetchingLatestVersion', azureBicepLatestReleaseUrl, error, stableAzureBicepVersion));
    }

    return latestVersion;
}

async function downloadAzureBicepToolInternal(version: string): Promise<string> {
    let cachedToolpath = toolLib.findLocalTool(bicepToolName, version);
    
    if (!cachedToolpath) {
        const downloadUrl = getDownloadUrl(version);

        let downloadPath;
        try {
            downloadPath = await toolLib.downloadTool(downloadUrl);
        }
        catch (ex) {
            throw new Error(tl.loc('AzureBicepDownloadFailed', downloadUrl, ex));
        }
        
        cachedToolpath = await toolLib.cacheFile(downloadPath, bicepToolName + getExecutableExtension(), bicepToolName, version);
        console.log(tl.loc("SuccessfullyDownloaded", version, cachedToolpath));
    } else {
        console.log(tl.loc("VersionAlreadyInstalled", version, cachedToolpath));
    }

    const bicepPath = path.join(cachedToolpath, bicepToolName + getExecutableExtension());
    fs.chmodSync(bicepPath, '777');
    return bicepPath;
}

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }

    return '';
}

function getDownloadUrl(version: string) {
    const downloadUrlFormat = 'https://github.com/Azure/bicep/releases/download/%s/bicep-%s%s';
    const fileExtension = getExecutableExtension();
    switch (os.type()) {
        case 'Linux':
            return util.format(downloadUrlFormat, version, 'linux-x64', fileExtension);

        case 'Darwin':
            return util.format(downloadUrlFormat, version, 'osx-x64', fileExtension);

        case 'Windows_NT':
        default:
            return util.format(downloadUrlFormat, version, 'win-x64', fileExtension);

    }
}
