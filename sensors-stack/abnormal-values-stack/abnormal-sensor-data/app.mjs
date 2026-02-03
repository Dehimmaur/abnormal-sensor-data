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
const ENV_TOPIC_LOW = "LOW_SENSOR_DATA_TOPIC_ARN";
const ENV_TOPIC_HIGH = "HIGH_SENSOR_DATA_TOPIC_ARN";

const SENSORS_NORMAL_VALUES = {
  "123": [30, 60],
  "124": [10, 80],
  "125": [20, 30],
  "126": [60, 120],
};
export const lambdaHandler = async (event, __) => {
  try {
    const topicArnLow = process.env[ENV_TOPIC_LOW];
    if (!topicArnLow)
      throw new Error("missing env. variable for low values topic arn");
    logger.debug(`topicARNLow is ${topicArnLow}`);
    const topicArnHigh = process.env[ENV_TOPIC_HIGH];
    if (!topicArnHigh)
      throw new Error("missing env. variable for high values topic arn");
    logger.debug(`topicARNHigh is ${topicArnHigh}`);

    const records = event?.Records ?? [];
    for (let record of records) {
      await processRecord(record, topicArnLow, topicArnHigh);
    }
  } catch (e) {
    logger.error(`ERROR: ${e?.message ?? String(e)}`);
    throw e;
  }
};
async function processRecord(record, topicArnLow, topicArnHigh) {
  const messageJSON = record?.Sns?.Message;
  logger.debug(`message from SNS record is ${messageJSON}`);
  const data = JSON.parse(messageJSON)
  const {sensorId, value, timestamp} = data
  const minValue = SENSORS_NORMAL_VALUES[sensorId][0];
  const maxValue = SENSORS_NORMAL_VALUES[sensorId][1];

  if (value < minValue) {
    publish({sensorId, value, minValue, timestamp }, topicArnLow)
  } else if (value > maxValue) {
    publish({sensorId, value, maxValue, timestamp }, topicArnHigh)
  }

}
