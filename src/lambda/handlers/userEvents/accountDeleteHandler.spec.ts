import { getUserEventPayload } from './accountDeleteHandler';
import { UserEventPayloadSnowplow } from '../../snowplow/types';

describe('getUserEventPayload',() => {
  it('should convert sqs event to UserEventPayload',() => {

    const expected : UserEventPayloadSnowplow= {
      user: {
        id: '1',
        email: 'test@gmail.com',
        isPremium: false
      },
     apiUser: {
       apiId: '1'
     },
      eventType: 'ACCOUNT_DELETE'
    };

    const testEventBridgePayload = {
      'source': 'user-events',
      'detail-type' : ['account-deletion'],
      'detail' : {
        userId: '1',
        email: 'test@gmail.com',
        isPremium: false,
        apiId: '1'
      }
    }
    const payload = getUserEventPayload(JSON.stringify({Message: testEventBridgePayload}));
    expect(payload).toEqual(expected)
  })
})
