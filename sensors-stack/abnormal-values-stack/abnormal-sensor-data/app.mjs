import logger from "/opt/nodejs/index.mjs";
import { publish } from "/opt/nodejs/publisher.mjs";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({});
const SENSORS_CACHE = {};

const ENV_LOW_TOPIC = "LOW_SENSOR_DATA_TOPIC_ARN";
const ENV_HIGH_TOPIC = "HIGH_SENSOR_DATA_TOPIC_ARN";
const ENV_PROVIDER = "SENSOR_DATA_PROVIDER_FUNCTION_NAME";
const ENV_STALE_TIME = "STALE_TIME"; // в секундах

function isStale(timestamp) {
  const staleTime = process.env[ENV_STALE_TIME];
  if (!staleTime) return false;
  return (Date.now() - timestamp) / 1000 > Number(staleTime);
}

async function getSensorValues(sensorId, providerFunction) {
  if (SENSORS_CACHE[sensorId] && !isStale(SENSORS_CACHE[sensorId].timesytamp)) {
    return SENSORS_CACHE[sensorId].values;
  }

  const command = new InvokeCommand({
    FunctionName: providerFunction,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify({ sensorId }))
  });

  const response = await lambdaClient.send(command);
  const payload = JSON.parse(Buffer.from(response.Payload).toString());

  const values = payload.values || [0, 0];
  SENSORS_CACHE[sensorId] = { values, timestamp: Date.now() };
  return values;
}

async function processRecord(record, lowTopic, highTopic, providerFunction) {
  const data = JSON.parse(record.Sns.Message);
  const { sensorId, value, timestamp } = data;

  if (!sensorId || value === undefined) {
    logger.error({ data }, "Invalid record structure, skipping");
    return;
  }

  const [minValue, maxValue] = await getSensorValues(sensorId, providerFunction);

  logger.debug({ sensorId, value, minValue, maxValue }, "Processing sensor data");

  if (value < minValue) {
    await publish({ sensorId, value, minValue, timestamp: timestamp || Date.now() }, lowTopic);
  } else if (value > maxValue) {
    await publish({ sensorId, value, maxValue, timestamp: timestamp || Date.now() }, highTopic);
  } else {
    logger.debug({ sensorId, value }, "Value within normal range, skipping");
  }
}

export const lambdaHandler = async (event) => {
  try {
    const lowTopic = process.env[ENV_LOW_TOPIC];
    const highTopic = process.env[ENV_HIGH_TOPIC];
    const providerFunction = process.env[ENV_PROVIDER];

    for (const record of event.Records) {
      await processRecord(record, lowTopic, highTopic, providerFunction);
    }
  } catch (err) {
    logger.error(err, "Error in abnormal-sensor-data Lambda");
    throw err;
  }
};
