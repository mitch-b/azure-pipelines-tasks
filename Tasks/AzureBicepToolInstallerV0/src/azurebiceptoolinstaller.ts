"use strict";

import * as tl from 'azure-pipelines-task-lib/task';
import * as path from 'path';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as utils from './utils';

tl.setResourcePath(path.join(__dirname, '..', 'task.json'));

let telemetry = {
    jobId: tl.getVariable('SYSTEM_JOBID')
};

console.log("##vso[telemetry.publish area=%s;feature=%s]%s",
    "TaskEndpointId",
    "AzureBicepToolInstallerV0",
    JSON.stringify(telemetry));

async function downloadAzureBicepTool() {
    const version = await utils.getBicepToolVersion();
    const bicepToolPath = await utils.downloadAzureBicepTool(version);

    // prepend the tools path. instructs the agent to prepend for future tasks
    if (!process.env['PATH'].startsWith(path.dirname(bicepToolPath))) {
        toolLib.prependPath(path.dirname(bicepToolPath));
    }
}

async function verifyAzureBicepTool() {
    console.log(tl.loc("VerifyingAzureBicepInstallation"));
    const bicepToolPath = tl.which("bicep", true);
    var bicep = tl.tool(bicepToolPath);
    bicep.arg("--version");
    return bicep.exec();
}

downloadAzureBicepTool()
    .then(() => verifyAzureBicepTool())
    .then(() => {
        tl.setResult(tl.TaskResult.Succeeded, "");
    }).catch((error) => {
        tl.setResult(tl.TaskResult.Failed, error)
    });