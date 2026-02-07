import logger from "/opt/nodejs/index.mjs";
import { publish } from "/opt/nodejs/publisher.mjs";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const ENV_TOPIC_LOW = "LOW_SENSOR_DATA_TOPIC_ARN";
const ENV_TOPIC_HIGH = "HIGH_SENSOR_DATA_TOPIC_ARN";
const ENV_LAMBDA = "SENSOR_DATA_PROVIDER_FUNCTION_NAME";
const ENV_STALE_TIME = "STALE_TIME"; // в секундах

// Кеш с меткой времени для устаревания
const SENSORS_CACHE = {};

const lambdaClient = new LambdaClient({});

/** Проверка, устарели ли значения */
function isStale(timestamp) {
  const staleTime = process.env[ENV_STALE_TIME];
  if (!staleTime) return false;
  const stale = (Date.now() - timestamp) / 1000 > Number(staleTime);
  if (stale) logger.debug(`CACHE EXPIRED: timestamp=${timestamp} older than STALE_TIME=${staleTime}s`);
  return stale;
}

/** Получение значений сенсора с кешем */
async function getSensorValues(sensorId, providerFunction) {
  if (SENSORS_CACHE[sensorId] && !isStale(SENSORS_CACHE[sensorId].timestamp)) {
    logger.debug(`[CACHE HIT] Using cached values for sensor ${sensorId}:`, SENSORS_CACHE[sensorId].values);
    return SENSORS_CACHE[sensorId].values;
  }

  logger.debug(`[CACHE MISS] No cached values or cache stale for sensor ${sensorId}. Calling provider Lambda ${providerFunction}`);
  
  const command = new InvokeCommand({
    FunctionName: providerFunction,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify({ sensorId }))
  });

  const response = await lambdaClient.send(command);
  const payload = JSON.parse(Buffer.from(response.Payload).toString("utf-8"));

  const values = payload.values || [0, 0];
  SENSORS_CACHE[sensorId] = { values, timestamp: Date.now() };

  logger.debug(`[CACHE UPDATE] Cached new values for sensor ${sensorId}:`, values);
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
    logger.info(`[LOW] sensorId=${sensorId} value=${value} < minValue=${minValue}`);
    await publish({ sensorId, value, minValue, timestamp: timestamp || Date.now() }, topicArnLow);
  } else if (value > maxValue) {
    logger.info(`[HIGH] sensorId=${sensorId} value=${value} > maxValue=${maxValue}`);
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
