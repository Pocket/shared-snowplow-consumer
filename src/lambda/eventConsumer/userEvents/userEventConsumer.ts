import { UserEventHandler } from '../../snowplow/userEventHandler';
import {
  EventTypeString,
  UserEventPayloadSnowplow,
} from '../../snowplow/types';
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
  'account-deletion': 'ACCOUNT_DELETE',
  'account-email-updated': 'ACCOUNT_EMAIL_UPDATED',
};

export async function userEventConsumer(record: SQSRecord) {
  await new UserEventHandler().process(getUserEventPayload(record.body));
}

export function getUserEventPayload(eventObj: any): UserEventPayloadSnowplow {
  eventObj = JSON.parse(eventObj);
  const message = JSON.parse(eventObj.Message);
  const messageBody: UserEventPayload = message['detail'];
  const detailType = message['detail-type'];

  return {
    user: {
      id: messageBody.userId,
      email: messageBody.email,
      isPremium: messageBody.isPremium ? true : false,
    },
    apiUser: {
      apiId: messageBody.apiId,
    },
    eventType: DetailTypeToSnowplowMap[detailType],
  };
}
