export type Account = {
  object_version: 'new';
  user_id: number;
  hashed_user_id?: string;
  emails?: string[];
};

export type ObjectUpdate = {
  trigger: SnowplowEventType;
  object: 'account';
};

export type User = {
  email?: string;
  guid?: number;
  hashed_guid?: string;
  user_id?: number;
  hashed_user_id?: string;
};

export type ApiUser = {
  api_id: number;
  name?: string;
  is_native?: boolean;
  is_trusted?: boolean;
  client_version?: string;
};

export enum EventType {
  ACCOUNT_DELETE = 'ACCOUNT_DELETE',
  ACCOUNT_EMAIL_UPDATED = 'ACCOUNT_EMAIL_UPDATED',
}

export type BasicUserEventPayloadWithContext = {
  user: {
    id: string;
    hashedId?: string;
    email?: string;
    guid?: number;
    hashedGuid?: string;
    isPremium?: boolean;
  };
  apiUser: {
    apiId: string;
    name?: string;
    isNative?: boolean;
    isTrusted?: boolean;
    clientVersion?: string;
  };
  request?: {
    language?: string;
    snowplowDomainUserId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

export type EventTypeString = keyof typeof EventType;

export type UserEventPayloadSnowplow = BasicUserEventPayloadWithContext & {
  eventType: EventTypeString;
};

export type SnowplowEventType = 'account_email_updated' | 'account_delete';

export const SnowplowEventMap: Record<EventTypeString, SnowplowEventType> = {
  ACCOUNT_DELETE: 'account_delete',
  ACCOUNT_EMAIL_UPDATED: 'account_email_updated',
};
