import sinon from 'sinon';
import { EventEmitter } from 'events';
import { DeleteMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import * as Sentry from '@sentry/node';
import { config } from './config';
import { SqsConsumer } from './SqsConsumer';
import * as Consumer from './eventConsumer/userEvents/userEventConsumer';
import { userEventConsumer } from './eventConsumer/userEvents/userEventConsumer';


export async function stubUserEventConsumer(requestBody: any) {
  return requestBody;
}
describe('sqsConsumer', () => {
  const emitter = new EventEmitter();
  const sqsConsumer = new SqsConsumer(emitter, false);
  const fakeMessageBody: any = {
      version: '0',
      'detail-type': 'account-deletion',
      source: 'user-events',
      account: '410318598490',
      time: '2022-10-11T02:47:51Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        userId: '1',
        email: 'test@gmail.com',
        apiId: '123abc',
        isPremium: false,
        language: 'en',
        ipAddress: '127.0.0.1',
        hashedGuid: 'abcd123',
      },
  }
  let scheduleStub: sinon.SinonStub;
  let sentryStub: sinon.SinonStub;
  let consoleStub: sinon.SinonStub;

  beforeEach(() => {
    sinon.restore();
    scheduleStub = sinon
      .stub(sqsConsumer, 'scheduleNextPoll')
      .resolves();

    sentryStub = sinon.stub(Sentry, 'captureException');
    consoleStub = sinon.stub(console, 'error');
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
        const testMessages = { Messages: [{ Body: JSON.stringify(fakeMessageBody) }] };

        sinon
          .stub(SQSClient.prototype, 'send')
          .resolves(testMessages);

        //todo: this stub doesn't work.
        const stub = sinon
          .stub(
           Consumer, 'userEventConsumer' ).callsFake(stubUserEventConsumer)

        await sqsConsumer.pollMessage();
        expect(
          stub.calledOnceWithExactly(testMessages.Messages[0].Body)
        ).toEqual(1);
      });
    });
  });

  it('schedules polling another message after a delay', async () => {
    const sqsMessage = { Messages: [{ Body: JSON.stringify(fakeMessageBody) }] };
    sinon
      .stub(SQSClient.prototype, 'send')
      .resolves(sqsMessage);
    sinon.stub(sqsConsumer, 'processMessage').resolves(true);
    await sqsConsumer.pollMessage();
    expect(scheduleStub.calledOnceWithExactly(500)).toBe(true);
  });

  it('sends a delete if message was successfully processed', async () => {
    sinon.stub(sqsConsumer, 'processMessage').resolves(true);
    const sqsStub = sinon
      .stub(SQSClient.prototype, 'send')
      .onFirstCall()
      .resolves({ Messages: [{ Body: JSON.stringify(fakeMessageBody) }] })
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
    const testVal = { Messages: [{ Body: JSON.stringify(fakeMessageBody) }] };
    sinon.stub(sqsConsumer, 'processMessage').resolves(false);
    const sqsStub = sinon
      .stub(SQSClient.prototype, 'send')
      .onFirstCall()
      .resolves(testVal)
      .onSecondCall()
      .resolves().onThirdCall().resolves();
    await sqsConsumer.pollMessage();
    expect(sqsStub.callCount).toEqual(3);
    expect(sqsStub.secondCall.args[0].input).toEqual(
      new SendMessageCommand({
        QueueUrl: config.aws.sqs.sharedSnowplowQueue.dlqUrl,
        MessageBody: (testVal.Messages[0].Body),
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
