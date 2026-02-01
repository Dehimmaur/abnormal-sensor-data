/**
 * Low Data Processor Handler
 * Subscribes to low-sensor-data stream and processes low abnormality sensor readings
 *
 * Event doc: https://docs.aws.amazon.com/lambda/latest/dg/invocation_tolerable_failure_rates.html
 * @param {Object} event - SNS Event
 * @param {Object} context - Lambda Context
 */

import logger from "/opt/nodejs/index.mjs";

export const lambdaHandler = async (event, context) => {
  logger.info("Low Data Processor Handler invoked");
  logger.debug("Event: " + JSON.stringify(event));

  // TODO: Implement logic to:
  // 1. Process low-severity abnormal sensor data
  // 2. Perform necessary actions or store in database

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Low sensor data processed",
    }),
  };
};
