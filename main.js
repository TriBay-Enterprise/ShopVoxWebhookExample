"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const tmp = __importStar(require("tmp"));
//Is always required even if the function is not used (timer fired)
async function jobArrived(s, flowElement, job) {
}
/**
 * When the flow starts subscribe to the webhook path
 * @param s
 * @param flowElement
 */
async function flowStartTriggered(s, flowElement) {
    let api_token = await flowElement.getPropertyStringValue("api_token");
    let webhookPath = await flowElement.getPropertyStringValue("uri");
    await flowElement.log(LogLevel.Info, "Attempting to subscribe to /scripting" + webhookPath);
    try {
        await s.httpRequestSubscribe(HttpRequest.Method.POST, webhookPath, [api_token]);
        await flowElement.log(LogLevel.Info, "Subscription was successful");
    }
    catch (error) {
        await flowElement.log(LogLevel.Error, "Subscription failed!");
        await flowElement.log(LogLevel.Error, error.stack);
    }
}
/**
* Sends back the initial response, the response will be different if the uuid already exists in global data.
* @param request
* @param args
* @param response
* @param s
*/
async function httpRequestTriggeredSync(request, args, response, s) {
    let eCommerceData = request.getBodyAsString();
    let eCommerceParse = JSON.parse(eCommerceData);
    let jobID = eCommerceParse.event.id;
    let processedIDS = {};
    let idsFromGlobalData = await s.getGlobalData(Scope.FlowElement, "uuids");
    if (idsFromGlobalData !== "") {
        processedIDS = JSON.parse(idsFromGlobalData);
    }
    if (jobID in processedIDS == true) {
        response.setStatusCode(418);
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('api_token', args[0]);
        response.setBody(Buffer.from(JSON.stringify({ "result": "error", "message": "Job with ID " + jobID + " already exists", "api_token": args[0] })));
    }
    else {
        response.setStatusCode(200);
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('api_token', args[0]);
        response.setBody(Buffer.from(JSON.stringify({ "result": "success", "orderID": jobID, "api_token": args[0] })));
    }
}
/**
 * Processes the request by downloading the production file from the defined url and injecting in the flow while at the same time attaching the product description as a dataset
 * @param request
 * @param args
 * @param s
 * @param flowElement
 */
async function httpRequestTriggeredAsync(request, args, s, flowElement) {
    //Parse JSON from Body
    let data = request.getBodyAsString();
    let dataParsed = JSON.parse(data);
    await flowElement.log(LogLevel.Debug, `Webhook triggered for job ${dataParsed.event.id}.`);
    //Define Dataset
    let tmpDatasetFile = tmp.fileSync({ postfix: ".json" }).name;
    let datasetName = await flowElement.getPropertyStringValue('datasetName');
    fs.writeFileSync(tmpDatasetFile, data);
    //Create job containing the production file and define dataset
    let job = await flowElement.createJob(tmpDatasetFile);
    await job.createDataset(datasetName, tmpDatasetFile, DatasetModel.JSON);
    await job.sendToSingle(dataParsed.event.id + '.json');
    fs.unlinkSync(tmpDatasetFile);
}
//# sourceMappingURL=main.js.map