import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import logger from "/opt/nodejs/index.mjs";

const db = new DynamoDBClient({});

export const lambdaHandler = async (event) => {
  const tableName = process.env.TABLE_NAME;
  logger.debug({ tableName, event }, "LowDataProcessor received event");

  for (const record of event.Records) {
    try {
      const data = JSON.parse(record.Sns.Message);

      if (!data.sensorId || data.value === undefined) {
        logger.error({ data }, "Invalid record, skipping");
        continue;
      }

      const item = {
        sensorId: { S: data.sensorId },
        timestamp: { N: String(data.timestamp || Date.now()) },
        status: { S: 'LOW_PROCESSED' },
        value: { N: String(data.value) },
        minValue: { N: String(data.minValue || 0) }
      };

      await db.send(new PutItemCommand({ TableName: tableName, Item: item }));
      logger.info({ item }, "Inserted LOW value into DynamoDB");
    } catch (err) {
      logger.error(err, "Error processing LOW sensor record");
    }
  }
};
