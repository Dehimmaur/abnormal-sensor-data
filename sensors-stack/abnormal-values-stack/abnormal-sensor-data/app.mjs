/**
 * Abnormal Sensor Data Handler
 * Subscribes to ingest stream and publishes to low-sensor-data and high-sensor-data streams
 *
 * Event doc: https://docs.aws.amazon.com/lambda/latest/dg/invocation_tolerable_failure_rates.html
 * @param {Object} event - SNS Event
 * @param {Object} context - Lambda Context
 */

import logger from "/opt/nodejs/index.mjs";
import { publish } from "/opt/nodejs/publisher.mjs";
import {InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda"
const ENV_TOPIC_LOW = "LOW_SENSOR_DATA_TOPIC_ARN";
const ENV_TOPIC_HIGH = "HIGH_SENSOR_DATA_TOPIC_ARN";
const ENV_LAMBDA = "SENSOR_DATA_PROVIDER_FUNCTION_NAME"
const SENSORS_NORMAL_VALUES = {
 
};
const lambdaClient = new LambdaClient({})
export const lambdaHandler = async (event, __) => {
  try {
    logger.debug(`cache is ${JSON.stringify(SENSORS_NORMAL_VALUES)}`)
    const topicArnLow = process.env[ENV_TOPIC_LOW];
    if (!topicArnLow)
      throw new Error("missing env. variable for low values topic arn");
    logger.debug(`topicARNLow is ${topicArnLow}`);
    const topicArnHigh = process.env[ENV_TOPIC_HIGH];
    if (!topicArnHigh)
      throw new Error("missing env. variable for high values topic arn");
    logger.debug(`topicARNHigh is ${topicArnHigh}`);
    const functionName = process.env[ENV_LAMBDA]
    if (!functionName)
      throw new Error("missing env. variable for lambda function name");
    logger.debug(`invoked lambda function is ${functionName}`);
    const records = event?.Records ?? [];
    for (let record of records) {
      await processRecord(record, topicArnLow, topicArnHigh, functionName);
    }
  } catch (e) {
    logger.error(`ERROR: ${e?.message ?? String(e)}`);
    throw e;
  }
};
async function processRecord(record, topicArnLow, topicArnHigh, FunctionName) {
  const messageJSON = record?.Sns?.Message;
  logger.debug(`message from SNS record is ${messageJSON}`);
  const data = JSON.parse(messageJSON)
  const {sensorId, value, timestamp} = data
  logger.debug(`cache contains value for sensor ${sensorId} that is ${SENSORS_NORMAL_VALUES[sensorId]}`)
  const minValue = SENSORS_NORMAL_VALUES[sensorId] ?
   SENSORS_NORMAL_VALUES[sensorId][0] : await getValuesFromInvocation(sensorId, FunctionName);
  const maxValue = SENSORS_NORMAL_VALUES[sensorId][1]
  logger.debug(`for sensor ${sensorId} minValue=${minValue} maxValue=${maxValue}`)

  if (value < minValue) {
    publish({sensorId, value, minValue, timestamp }, topicArnLow)
  } else if (value > maxValue) {
    publish({sensorId, value, maxValue, timestamp }, topicArnHigh)
  }

}
async function getValuesFromInvocation(sensorId,  FunctionName){
    logger.debug(` ${FunctionName} to be invoked` )
    const command = new InvokeCommand({
      FunctionName,
      InvocationType: "RequestResponse",
      Payload: Buffer.from(JSON.stringify({
             sensorId
      }))
    })
    const response = await lambdaClient.send(command)
    const minValue =  processResponseFromLambda(response)
    logger.debug(`returned minimal value of sensor ${sensorId} is ${minValue}`)
    logger.debug(`object SENSORS_NORMAL_VALUES for sensor ${sensorId} contains ${SENSORS_NORMAL_VALUES[sensorId]} values`)
    return minValue
}
function processResponseFromLambda(response) {
    const respObj = JSON.parse(Buffer.from(response.Payload).toString("utf-8"))
    SENSORS_NORMAL_VALUES[respObj.sensorId] = respObj.values
    return respObj.values[0]

}
