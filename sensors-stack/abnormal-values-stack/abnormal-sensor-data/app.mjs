/**
 * Abnormal Sensor Data Handler
 * Subscribes to ingest stream and publishes to low-sensor-data and high-sensor-data streams
 */

import logger from "/opt/nodejs/index.mjs";
import { publish } from "/opt/nodejs/publisher.mjs";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const ENV_TOPIC_LOW = "LOW_SENSOR_DATA_TOPIC_ARN";
const ENV_TOPIC_HIGH = "HIGH_SENSOR_DATA_TOPIC_ARN";
const ENV_LAMBDA = "SENSOR_DATA_PROVIDER_FUNCTION_NAME";
const ENV_STALE_TIME = "STALE_TIME"; // в секундах

// Кеш с меткой времени для устаревания
const SENSORS_NORMAL_VALUES = {};

const lambdaClient = new LambdaClient({});

/** Проверка, устарели ли значения */
function isStale(timestamp) {
  const staleTime = process.env[ENV_STALE_TIME];
  if (!staleTime) return false;
  return (Date.now() - timestamp) / 1000 > Number(staleTime);
}

/** Получение значений из кеша или Lambda provider */
async function getSensorValues(sensorId, functionName) {
  if (SENSORS_NORMAL_VALUES[sensorId] && !isStale(SENSORS_NORMAL_VALUES[sensorId].timestamp)) {
    return SENSORS_NORMAL_VALUES[sensorId].values;
  }

  logger.debug(`Cache miss or stale for sensor ${sensorId}, invoking provider Lambda ${functionName}`);

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify({ sensorId }))
  });

  const response = await lambdaClient.send(command);
  const payload = JSON.parse(Buffer.from(response.Payload).toString("utf-8"));

  const values = payload.values || [0, 0];
  SENSORS_NORMAL_VALUES[sensorId] = {
    values,
    timestamp: Date.now()
  };

  logger.debug(`Cached values for sensor ${sensorId}: ${values}`);
  return values;
}

/** Обработка одной записи SNS */
async function processRecord(record, topicArnLow, topicArnHigh, providerFunction) {
  const messageJSON = record?.Sns?.Message;
  const data = JSON.parse(messageJSON);
  const { sensorId, value, timestamp } = data;

  if (!sensorId || value === undefined) {
    logger.error({ data }, "Invalid record structure, skipping");
    return;
  }

  const [minValue, maxValue] = await getSensorValues(sensorId, providerFunction);

  logger.debug({ sensorId, value, minValue, maxValue }, "Processing sensor data");

  if (value < minValue) {
    await publish({ sensorId, value, minValue, timestamp: timestamp || Date.now() }, topicArnLow);
  } else if (value > maxValue) {
    await publish({ sensorId, value, maxValue, timestamp: timestamp || Date.now() }, topicArnHigh);
  } else {
    logger.debug({ sensorId, value }, "Value within normal range, skipping");
  }
}

/** Lambda handler */
export const lambdaHandler = async (event) => {
  try {
    const topicArnLow = process.env[ENV_TOPIC_LOW];
    const topicArnHigh = process.env[ENV_TOPIC_HIGH];
    const providerFunction = process.env[ENV_LAMBDA];

    if (!topicArnLow) throw new Error("missing env variable for low values topic ARN");
    if (!topicArnHigh) throw new Error("missing env variable for high values topic ARN");
    if (!providerFunction) throw new Error("missing env variable for provider Lambda function name");

    logger.debug(`Starting processing ${event.Records?.length || 0} records`);

    for (const record of event.Records) {
      await processRecord(record, topicArnLow, topicArnHigh, providerFunction);
    }
  } catch (err) {
    logger.error(err, "Error in abnormal-sensor-data Lambda");
    throw err;
  }
};
