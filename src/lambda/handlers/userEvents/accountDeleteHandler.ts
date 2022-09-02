import { UserEventSnowplowHandler } from './userEventSnowplowHandler';
import { tracker } from '../../snowplow/tracker';

type EventBridgePayload = {
  userId: string,
  email: string,
  apiId: string
}
export async function accountDeleteHandler(record: SQSRecord) {
  const { userId, email, apiId } = JSON.parse(JSON.parse(record.body).Message)[
    'detail'
    ];

  new UserEventSnowplowHandler().process({ userId, email, apiId })
}
