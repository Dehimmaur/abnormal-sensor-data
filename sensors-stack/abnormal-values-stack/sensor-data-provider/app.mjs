import logger from "/opt/nodejs/index.mjs";
export const handler = async (event) => {
    const SENSORS_NORMAL_VALUES = {
      "123": [30, 60],
      "124": [10, 80],
      "125": [20, 30],
      "126": [60, 120]
    };
    const eventJSON = JSON.stringify(event) //for logs
    const {sensorId} = event
    if (!sensorId) {
        logger.error(`wrong event structure ${eventJSON}`)
        throw Error(`wrong event structure ${eventJSON}`)
    }
    logger.debug(`received event is ${eventJSON}`)
	return {
		sensorId,
        values: SENSORS_NORMAL_VALUES[sensorId]
	};
};
