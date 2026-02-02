/**
 * Abnormal Sensor Data Handler
 * Subscribes to ingest stream and publishes to low-sensor-data and high-sensor-data streams
 *
 * Event doc: https://docs.aws.amazon.com/lambda/latest/dg/invocation_tolerable_failure_rates.html
 * @param {Object} event - SNS Event
 * @param {Object} context - Lambda Context
 */

import logger from "/opt/nodejs/index.mjs";

export const lambdaHandler = async (event, context) => {
  logger.info("Abnormal Sensor Data Handler invoked");
  logger.debug("Event: " + JSON.stringify(event));

  // TODO: Implement logic to:
  // 1. Parse incoming sensor data from ingest stream
  // 2. Identify abnormal readings
  // 3. Classify as low or high abnormality
  // 4. Publish to appropriate stream (low-sensor-data or high-sensor-data)

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Abnormal sensor data processed",
    }),
  };
};
