import logger from "/opt/nodejs/index.mjs";

const SENSORS_NORMAL_VALUES = {
  "123": [30, 60],
  "124": [10, 80],
  "125": [20, 30],
  "126": [60, 120]
};

export const handler = async (event) => {
  const { sensorId } = event;

  if (!sensorId) {
    logger.error(`Wrong event structure: ${JSON.stringify(event)}`);
    throw new Error(`Wrong event structure: ${JSON.stringify(event)}`);
  }

  logger.debug(`Returning normal values for sensor ${sensorId}`);

  return {
    sensorId,
    values: SENSORS_NORMAL_VALUES[sensorId] || [0, 0]
  };
};
