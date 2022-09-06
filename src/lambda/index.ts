import * as Sentry from '@sentry/serverless';
import { SQSBatchItemFailure, SQSRecord } from 'aws-lambda';
import { userEventConsumer } from './eventConsumer/userEvents/userEventConsumer';

//add event type as `source` from event-bridge
export enum EventType {
  USER_EVENT = 'user-events',
}
// Mapping of detail-type (via event bridge message)
// to function that should be invoked to process the message
export const eventConsumer: {
  [key: string]: (message: SQSRecord) => Promise<void>;
} = {
  [EventType.USER_EVENT]: userEventConsumer,
};

export async function processor(event: any): Promise<any> {
  const batchFailures: SQSBatchItemFailure[] = [];
  for await (const record of event.Records) {
    try {
      const message = JSON.parse(JSON.parse(record.body).Message);
      if (eventConsumer[message['source']] == null) {
        throw new Error(
          `Unable to retrieve handler for source='${message['source']}'`
        );
      }
      await eventConsumer[message['source']](record);
    } catch (error) {
      console.log(error);
      Sentry.captureException(error);
      batchFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: batchFailures };
}

export const handler = Sentry.AWSLambda.wrapHandler(processor);
