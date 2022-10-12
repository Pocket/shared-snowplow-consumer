import { processor } from './index';
import sinon from 'sinon';
import nock from 'nock';
import * as SendEventCaller from './sendEventCaller';
import { config } from './config';

describe('processor', () => {
  it('calls sendEvent with eventFormat as the request body', async () => {
    nock(config.endpoint).post(config.sendEventPath).reply(200);
    const callerSpy = sinon.spy(SendEventCaller, 'callSendEventEndpoint');
    const testSqsRecords = [
      {
        messageId: 'f679797f-889e-47a0-8665-5ea57e810f28',
        receiptHandle:
          'AQEBMKBFHbwE+hRSZNayMEQoLoiGYJ7Lm/eBzfYWElROM9+UScRC97KVLWlqxcQgJy0dpVxC+/ywyOE8/JAbL7SDcFvqRrpxbii9ZyHI3HgkqkbEe8Cf1HkQnxnGfc4uDnhov0zWLXP2RACcIIXAQjI1itzwCmViOb6LhYrEPqAXkkWg1K54pEhzN1+VPAN5NqnKVrcGV9awpC1yOa684stQv88lSXLzLC15oSEgb798h6O0qu83ZDfA9YJW/MYrI3PZp2epkDnjhvDH8jLDZfywpc9hTWYQ5SwM+4MlkSa+6t86jkzX6O6U4niYt1TgRlNg2fUi9S8DM2XtDJHynFxJMD7QtBCSAO+EF5IVgEBjT+sHBUolTVsnYyytv4NKGryjP2tMF/ltFVgN2oYfAtB05SbGqZi2jlpDVTL7iF/L7uaOJszqcvVnJCV1n22FZoJO',
        body: '{\n  "Type" : "Notification",\n  "MessageId" : "7042d498-cd45-553e-b721-8f263aa030b1",\n  "TopicArn" : "arn:aws:sns:us-east-1:1110000:PocketEventBridge-Dev-UserEventTopic",\n  "Message" : "{\\"version\\":\\"0\\",\\"id\\":\\"abcd-efgh\\",\\"detail-type\\":\\"account-deletion\\",\\"source\\":\\"user-events\\",\\"account\\":\\"11110000\\",\\"time\\":\\"2022-10-11T02:47:51Z\\",\\"region\\":\\"us-east-1\\",\\"resources\\":[],\\"detail\\":{\\"userId\\":\\"1\\",\\"email\\":\\"test@gmail.com\\",\\"apiId\\":\\"123abc\\",\\"isPremium\\":false}}",\n  "Timestamp" : "2022-10-11T04:48:37.431Z",\n  "SignatureVersion" : "1",\n  "Signature" : "LsXIirSEMHuDsOFAe8/Ast9nEvocxoIwhytjJhipzwlqvoDr4Fa286iTDOix7LaBm+0F7t9y2NdDIeGFDghpMzxXQItPkep3VLI67BlKJ2XNyeNJVqyv/jNy3Jf35nx4sguYCEUfbgnOII3Ii3OnP43AFd1NBQwLpGxL4RyfX8WWBzyWpa9S5uE5iNifjhpe03GX3Arx+ZDZbbRuNMS7/OChlYao2ghRRygKyXL917bv6lHH6RmjCQypX3Q6Ys/k6a1Y9sTbK9rJD4sBcVgWEExHefsVa8ok4mu1/NzWuFc+qcOGX+wgd1HPDPhe+EIYtwirN8UJsj/R54MJTzvO8w==",\n  "SigningCertURL" : "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem",\n  "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:11110000:PocketEventBridge-Dev-UserEventTopic:94fbf13d-7156-43d6-a237-8bb636463a8b"\n}',
        attributes: {
          ApproximateReceiveCount: '3',
          SentTimestamp: '1665463717466',
          SenderId: 'AIDAIT2UOQQY3AUEKVGXU',
          ApproximateFirstReceiveTimestamp: '1665463727795',
        },
        messageAttributes: {},
        md5OfBody: 'dcd3b8ea2ed7237a8c1d29db1cb1676e',
        eventSource: 'aws:sqs',
        eventSourceARN:
          'arn:aws:sqs:us-east-1:1110000:SharedSnowplowConsumer-Dev-SharedEventConsumer-Queue',
        awsRegion: 'us-east-1',
      },
    ];

    const requestBody = {
      version: '0',
      id: 'abcd-efgh',
      'detail-type': 'account-deletion',
      source: 'user-events',
      account: '11110000',
      time: '2022-10-11T02:47:51Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        userId: '1',
        email: 'test@gmail.com',
        apiId: '123abc',
        isPremium: false,
      },
    };

    await processor({ Records: testSqsRecords });
    expect(callerSpy.calledOnceWithExactly(requestBody)).toBe(true);
  });
});
