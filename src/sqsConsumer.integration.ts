import {
  ReceiveMessageCommand,
  ReceiveMessageCommandOutput,
  SendMessageCommand,
  SQS,
} from '@aws-sdk/client-sqs';
import { config } from './config';
import * as Sentry from '@sentry/node';

describe('can read eventBridge content from queue and process it', () => {
  it('process messages properly', async () => {
    const sqs = new SQS({
      region: config.aws.region,
      endpoint: config.aws.endpoint,
      maxAttempts: 3,
    });

    const testEvent = {
      version: '0',
      id: 'fd4ee970-33d9-7c3e-826b-e88e426b227e',
      'detail-type': 'account-deletion',
      source: 'user-events',
      account: '410318598490',
      time: '2023-02-03T01:00:06Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        userId: '8',
        email: 'test@sri.com',
        isPremium: 'false',
      },
    };

    const sendCommand = new SendMessageCommand({
      QueueUrl: config.aws.sqs.sharedSnowplowQueue.url,
      MessageBody: JSON.stringify(testEvent),
    });
    try {
      await sqs.send(sendCommand);
    } catch (err) {
      const errorMessage = `unable to add event to queue: ${config.aws.sqs.sharedSnowplowQueue.url}`;
      console.log(errorMessage, err, { data: JSON.stringify(testEvent) });
    }

    const params = {
      AttributeNames: ['SentTimestamp'],
      MaxNumberOfMessages: config.aws.sqs.sharedSnowplowQueue.maxMessages,
      MessageAttributeNames: ['All'],
      QueueUrl: config.aws.sqs.sharedSnowplowQueue.url,
      VisibilityTimeout: config.aws.sqs.sharedSnowplowQueue.visibilityTimeout,
      WaitTimeSeconds: config.aws.sqs.sharedSnowplowQueue.waitTimeSeconds,
    };

    let data: ReceiveMessageCommandOutput;
    let body: any; //body is generic based on event payload

    try {
      data = await sqs.send(new ReceiveMessageCommand(params));
      if (data.Messages && data.Messages.length > 0) {
        body = JSON.parse(data.Messages[0].Body);
        console.log(`SQS body -> ` + JSON.stringify(body));
      }
    } catch (error) {
      const receiveError = `Error receiving messages from queue ${JSON.stringify(
        data?.Messages[0].Body['Message']
      )}`;
      console.error(receiveError, error);
      Sentry.addBreadcrumb({ message: receiveError });
      Sentry.captureException(error, { level: Sentry.Severity.Critical });
    }
  });
});
