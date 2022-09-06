import { UserEventHandler } from '../../snowplow/userEventHandler';
import { EventTypeString, SnowplowEventType, UserEventPayloadSnowplow } from '../../snowplow/types';
import { SQSRecord } from 'aws-lambda';


export type UserEventPayload = {
  userId: string;
  email?: string;
  isPremium?: boolean;
  apiId: string;
};

//detail-type in event rule
//defined here:
// https://github.com/Pocket/pocket-event-bridge/blob/f462cbb1b166d937fcd62319f88c90efc7653ebc/.aws/src/event-rules/user-api-events/eventConfig.ts#L3
export const DetailTypeToSnowplowMap: Record<string, EventTypeString> = {
  'account-deletion' : 'ACCOUNT_DELETE',
};

export async function accountDeleteHandler(record: SQSRecord) {
  await new UserEventHandler().process(getUserEventPayload(record.body))
}

export function getUserEventPayload(eventObj: string) :  UserEventPayloadSnowplow {
  const messageBody : UserEventPayload = (JSON.parse(eventObj).Message)[
    'detail'
    ];

  //detail-type is an array
  const detailType  = (JSON.parse(eventObj).Message)[
    'detail-type'
    ][0];

  return  {
    user: {
      id: messageBody.userId,
      email: messageBody.email,
      isPremium: messageBody.isPremium,
    },
    apiUser: {
      apiId: messageBody.apiId
    },
    eventType:DetailTypeToSnowplowMap[detailType]
  }
}
