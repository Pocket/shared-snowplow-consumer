import { UserEventHandler } from '../../snowplow/userEventHandler';
import {
  EventTypeString,
  UserEventPayloadSnowplow,
} from '../../snowplow/types';
import { SQSRecord } from 'aws-lambda';

export type UserEventPayload = {
  userId: string;
  email: string;
  isPremium?: boolean;
  apiId: string;
  hashedId?: string;
  guid?: number;
  hashedGuid?: string;
  name?: string;
  isNative?: boolean;
  isTrusted?: boolean;
  clientVersion?: string;
  language?: string;
  snowplowDomainUserId?: string;
  ipAddress?: string;
  userAgent?: string;
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
  console.log(eventObj)
  eventObj = JSON.parse(eventObj);
  const message = JSON.parse(eventObj.Message);
  const messageBody: UserEventPayload = message['detail'];
  const detailType = message['detail-type'];

  return   {
    user: {
      id: messageBody.userId,
      email: messageBody.email,
      isPremium: messageBody.isPremium ? true : false, //set as 0
      hashedId: messageBody.hashedId,
      guid: messageBody.guid,
      hashedGuid: messageBody.hashedGuid,
    },
    apiUser: {
      apiId: messageBody.apiId,
      name: messageBody.name,
      isNative: messageBody.isNative,
      isTrusted: messageBody.isTrusted,
      clientVersion: messageBody.clientVersion,
    },
    request: {
      language:messageBody.language,
      snowplowDomainUserId: messageBody.snowplowDomainUserId,
      ipAddress:messageBody.ipAddress,
      userAgent: messageBody.userAgent
    },
    eventType: DetailTypeToSnowplowMap[detailType],
  };
}
