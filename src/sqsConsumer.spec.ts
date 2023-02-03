import sinon from 'sinon';
import { EventEmitter } from 'events';
import {
  DeleteMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import * as Sentry from '@sentry/node';
import { config } from './config';
import { SqsConsumer } from './SqsConsumer';
import * as Consumer from './eventConsumer/userEvents/userEventConsumer';

export async function stubUserEventConsumer(requestBody: any) {
  return requestBody;
}
describe('sqsConsumer', () => {
  const emitter = new EventEmitter();
  const sqsConsumer = new SqsConsumer(emitter, false);

  //fake Message mimicing SQS Body
  //note: the message contains eventBridge content
  const FakeMessageBody = {
    Type: 'Notification',
    MessageId: 'a4d7147f-f13b-5374-9108-4829954554d8',
    TopicArn:
      'arn:aws:sns:us-east-1:410318598490:PocketEventBridge-Dev-UserEventTopic',
    Message:
      '{"version":"0","id":"ee0d2b37-c5ce-e0b2-75ab-0ffb4d7cf7e9","detail-type":"account-deletion","source":"user-events","account":"410318598490","time":"2023-02-03T01:00:06Z","region":"us-east-1","resources":[],"detail":{"userId":"8","email":"test@sri.com","isPremium":"false"}}',
    Timestamp: '2023-02-03T01:24:14.179Z',
    SignatureVersion: '1',
    Signature:
      'YEECQ59HFpio/Kp/r8Y2mk6OTiOAi6+l35wr2a54jrAf/TOqSbiGyKBOUdM8Brk88QEvkMJh6+OZ6g84YiFrA4VC1VrupaATP8WSe+oTl42J/UJRqipPm86rnBB+cUOMCjvpZ1yQ74PoOmkC7h/KNCyvjJp+SkhAElJr/Avai3zVwL8R5iPuJIsVfoWMFEGcu7CNn6lRflMVw+QYjnsxaa1Bc+JyVZUjJe/0C6MX+r0u44PoR5/aw06c0Fppr01bPdfB+R5RYLzafVRYXLIFFQ9jIAFQQdOEubpxmyOe1if5w16TmUI02ZLlOCRY3h2S5IvgoiIbNnh0RmOgmZrE2g==',
    SigningCertURL:
      'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem',
    UnsubscribeURL:
      'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:410318598490:PocketEventBridge-Dev-UserEventTopic:5eec23c7-c0b9-46db-be98-65ca0bcbfd73',
  };

  let scheduleStub: sinon.SinonStub;
  let sentryStub: sinon.SinonStub;
  let consoleStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();
    scheduleStub = sinon.stub(sqsConsumer, 'scheduleNextPoll').resolves();

    sentryStub = sinon.stub(Sentry, 'captureException');
    consoleStub = sinon.stub(console, 'error');
  });

  afterAll(() => {
    sinon.restore();
  });

  afterEach(() => {
    //require this to clear `spyOn` counts between tests
    jest.clearAllMocks();
  });

  it('sends an event when the class is initialized', () => {
    const eventSpy = sinon.spy(emitter, 'emit');
    sinon.stub(SqsConsumer.prototype, 'pollMessage').resolves();
    new SqsConsumer(emitter);
    expect(eventSpy.calledOnceWithExactly('pollSnowplowSqsQueue')).toBe(true);
  });

  it('invokes listener when pollSnowplowSqsQueue event is emitted', async () => {
    const listenerStub = sinon.stub(sqsConsumer, 'pollMessage').resolves();
    emitter.emit('pollSnowplowSqsQueue');
    expect(listenerStub.callCount).toEqual(1);
  });
  it('schedules a poll event after some time if no messages returned', async () => {
    sinon.stub(SQSClient.prototype, 'send').resolves({ Messages: [] });
    await sqsConsumer.pollMessage();
    expect(scheduleStub.calledOnceWithExactly(300000)).toBe(true);
  });

  it('logs critical error if could not receive messages, and reschedules', async () => {
    const error = new Error(`You got Q'd`);
    sinon.stub(SQSClient.prototype, 'send').rejects(error);
    await sqsConsumer.pollMessage();
    expect(
      sentryStub.calledOnceWithExactly(error, {
        level: Sentry.Severity.Critical,
      })
    ).toBe(true);
    expect(consoleStub.callCount).toEqual(1);
    //assert to reschedule after 5 mins
    expect(scheduleStub.calledOnceWithExactly(300000)).toBe(true);
  });

  describe('With a message', () => {
    describe('pollMessage', () => {
      it('invokes eventConsumer on successful message polling', async () => {
        const testMessages = {
          Messages: [{ Body: FakeMessageBody }],
        };

        sinon.stub(SQSClient.prototype, 'send').resolves(testMessages);

        //todo: this stub doesn't work.
        sinon.stub(Consumer, 'userEventConsumer').resolves(true);
        const spy = jest.spyOn(Consumer, 'userEventConsumer');
        await sqsConsumer.pollMessage();
        expect(spy).toBeCalledTimes(1);
      });
    });
  });

  it('schedules polling another message after a delay', async () => {
    const sqsMessage = {
      Messages: [{ Body: FakeMessageBody }],
    };
    sinon.stub(SQSClient.prototype, 'send').resolves(sqsMessage);
    sinon.stub(sqsConsumer, 'processMessage').resolves(true);
    await sqsConsumer.pollMessage();
    expect(scheduleStub.calledOnceWithExactly(100)).toBe(true);
  });

  it('sends a delete if message was successfully processed', async () => {
    sinon.stub(sqsConsumer, 'processMessage').resolves(true);
    const sqsStub = sinon
      .stub(SQSClient.prototype, 'send')
      .onFirstCall()
      .resolves({
        Messages: [{ Body: FakeMessageBody }],
      })
      .onSecondCall()
      .resolves();
    await sqsConsumer.pollMessage();
    expect(sqsStub.callCount).toEqual(2);
    expect(sqsStub.secondCall.args[0].input).toEqual(
      new DeleteMessageCommand({
        QueueUrl: config.aws.sqs.sharedSnowplowQueue.url,
        ReceiptHandle: undefined,
      }).input
    );
  });

  it('delete message and add to DLQ if not successfully processed', async () => {
    const testVal = {
      Messages: [{ Body: FakeMessageBody }],
    };
    sinon.stub(sqsConsumer, 'processMessage').resolves(false);
    const sqsStub = sinon
      .stub(SQSClient.prototype, 'send')
      .onFirstCall()
      .resolves(testVal)
      .onSecondCall()
      .resolves()
      .onThirdCall()
      .resolves();
    await sqsConsumer.pollMessage();
    expect(sqsStub.callCount).toEqual(3);
    expect(sqsStub.secondCall.args[0].input).toEqual(
      new SendMessageCommand({
        QueueUrl: config.aws.sqs.sharedSnowplowQueue.dlqUrl,
        MessageBody: testVal.Messages[0].Body.Message,
      }).input
    );
    expect(sqsStub.thirdCall.args[0].input).toEqual(
      new DeleteMessageCommand({
        QueueUrl: config.aws.sqs.sharedSnowplowQueue.url,
        ReceiptHandle: undefined,
      }).input
    );
  });
});
