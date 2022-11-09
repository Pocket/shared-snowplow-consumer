import * as Sentry from '@sentry/serverless';
import { SQSBatchItemFailure } from 'aws-lambda';
import { callSendEventEndpoint } from './sendEventCaller';

export async function processor(event: any): Promise<any> {
  const batchFailures: SQSBatchItemFailure[] = [];
  for await (const record of event.Records) {
    try {
      const requestBody = JSON.parse(JSON.parse(record.body).Message);
      console.log(`message received-> ${JSON.stringify(requestBody)}`);
      await callSendEventEndpoint(requestBody);
    } catch (error) {
      console.log(
        error,
        `failed to process the event -> ${JSON.stringify(record)}`
      );
      Sentry.captureException(error);
      batchFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures: batchFailures };
}

export const handler = Sentry.AWSLambda.wrapHandler(processor);
