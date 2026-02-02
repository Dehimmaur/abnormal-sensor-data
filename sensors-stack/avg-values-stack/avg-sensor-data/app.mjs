/**
 * Average Sensor Data Handler
 * Subscribes to ingest stream and publishes average sensor values to avg-sensor-values stream
 *
 * Event doc: https://docs.aws.amazon.com/lambda/latest/dg/invocation_tolerable_failure_rates.html
 * @param {Object} event - SNS Event
 * @param {Object} context - Lambda Context
 */

import logger from "/opt/nodejs/index.mjs";

export const lambdaHandler = async (event, context) => {
  logger.info("Average Sensor Data Handler invoked");
  logger.debug("Event: " + JSON.stringify(event));

  // TODO: Implement logic to:
  // 1. Parse incoming sensor data from ingest stream
  // 2. Calculate average values
  // 3. Publish averaged data to avg-sensor-values stream

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Average sensor data processed",
    }),
  };
};
