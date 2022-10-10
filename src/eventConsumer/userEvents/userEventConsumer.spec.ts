import { getUserEventPayload } from './userEventConsumer';
import { UserEventPayloadSnowplow } from '../../snowplow/types';

describe('getUserEventPayload', () => {
  it('should convert sqs event to UserEventPayload', () => {
    const expected: UserEventPayloadSnowplow = {
      user: {
        id: '1',
        email: 'test@gmail.com',
        isPremium: false,
      },
      apiUser: {
        apiId: '1',
      },
      request: {},
      eventType: 'ACCOUNT_DELETE',
    };

    const messageBody =
      '{\n  "Type" : "Notification",\n  "MessageId" : "bb1e08ab-d335-5a54-acb9-533a0c7616fd",\n  "TopicArn" : "arn:aws:sns:us-east-1:410318598490:PocketEventBridge-Dev-UserEventTopic",\n  "Message" : "{\\"version\\":\\"0\\",\\"id\\":\\"ee543402-6214-fb12-0ab1-df1bd77bc59b\\",\\"detail-type\\":\\"account-deletion\\",\\"source\\":\\"user-events\\",\\"account\\":\\"410318598490\\",\\"time\\":\\"2022-09-06T23:51:31Z\\",\\"region\\":\\"us-east-1\\",\\"resources\\":[],\\"detail\\":{\\"userId\\":\\"1\\",\\"email\\":\\"test@gmail.com\\",\\"isPremium\\":0,\\"language\\":null,\\"apiId\\":\\"1\\",\\"version\\":\\"1.0.0\\",\\"timestamp\\":1662508291,\\"eventType\\":\\"account-deletion\\"}}",\n  "Timestamp" : "2022-09-06T23:51:31.933Z",\n  "SignatureVersion" : "1",\n  "Signature" : "brqKt/P8/Btg8MSQxjnWfWrIBxT9PQJWozTfLenXrmGqHAgtwRcGA5pijhjcUG8gFvWfyQDzTUhrGAVyxBhPGdn41s3eckRqucAu9fnqOo+WuHPhkDwCP8gGSuM7CRD08E8YaEgeGRGCD0EBcgsr8ue9Gojq0VhX1BLRgIUq6MBxpG81HWHlPwTW6O1RCi0zkAzZlUH+x1RL2E94vZY3W6lr30Ja0UWHMpxWXeF3tuG5WiQxYaF8C/n3d+9UjISQ6L86D2KE/jfguGfQxyXnMiQrv4/aNXCsYLEzRC5bStgUf5FqeBsWfsUGxkdr8HNDX2O5I6e5fwSuyb0lVKAa6g==",\n  "SigningCertURL" : "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-56e67fcb41f6fec09b0196692625d385.pem",\n  "UnsubscribeURL" : "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:410318598490:PocketEventBridge-Dev-UserEventTopic:94fbf13d-7156-43d6-a237-8bb636463a8b"\n}';

    const payload = getUserEventPayload(messageBody);
    expect(payload).toEqual(expected);
  });
});
