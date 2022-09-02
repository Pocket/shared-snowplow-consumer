import * as Sentry from '@sentry/node';
import { buildSelfDescribingEvent, Tracker } from '@snowplow/node-tracker';
import { PayloadBuilder, SelfDescribingJson } from '@snowplow/tracker-core';
import { EventType, SnowplowEventMap, UserEventPayload } from './types';
import { Account, ApiUser, ObjectUpdate, User } from './types';
import config from '../../config';
import { EventHandler } from '../EventHandler';
import { tracker } from '../../snowplow/tracker';

type ObjectUpdateEvent = Omit<SelfDescribingJson, 'data'> & {
  data: ObjectUpdate;
};

type AccountContext = Omit<SelfDescribingJson, 'data'> & {
  data: Account;
};

type UserContext = Omit<SelfDescribingJson, 'data'> & {
  data: User;
};

type ApiUserContext = Omit<SelfDescribingJson, 'data'> & {
  data: ApiUser;
};

/**
 * This class MUST be initialized using the SnowplowHandler.init() method.
 * This is done to ensure event handlers adhere to the EventHandlerInterface.
 */
export class UserEventSnowplowHandler extends EventHandler {
  constructor() {
    super(tracker)
    return this;
  }

  /**
   * method to create and process event data
   * @param data
   */
  async process(data: UserEventPayload): Promise<void> {
    this.addRequestInfoToTracker(data);
    const event = buildSelfDescribingEvent({
      event: UserEventSnowplowHandler.generateAccountUpdateEvent(data),
    });
    const context = await UserEventSnowplowHandler.generateEventContext(data);
    await super.track(event, context);
  }

  /**
   * @private
   */
  private static generateAccountUpdateEvent(
    data: UserEventPayload
  ): ObjectUpdateEvent {
    return {
      schema: config.snowplow.schemas.objectUpdate,
      data: {
        trigger: SnowplowEventMap[data.eventType],
        object: 'account',
      },
    };
  }

  /**
   * @private to build event context for ACCOUNT_DELETE event.
   */
  private static generateDeleteEventAccountContext(
    data: UserEventPayload
  ): AccountContext {
    return {
      schema: config.snowplow.schemas.account,
      data: {
        object_version: 'new',
        user_id: parseInt(data.user.id),
      },
    };
  }

  private static generateAccountContext(
    data: UserEventPayload
  ): AccountContext {
    return {
      schema: config.snowplow.schemas.account,
      data: {
        object_version: 'new',
        user_id: parseInt(data.user.id),
        emails: [data.user.email],
      },
    };
  }

  private static async generateEventContext(
    data: UserEventPayload
  ): Promise<SelfDescribingJson[]> {
    const context = [
      UserEventSnowplowHandler.generateUserContext(data),
      UserEventSnowplowHandler.generateApiUserContext(data),
    ];

    data.eventType == EventType.ACCOUNT_DELETE
      ? context.push(UserEventSnowplowHandler.generateDeleteEventAccountContext(data))
      : context.push(UserEventSnowplowHandler.generateAccountContext(data));
    return context;
  }

  private static generateUserContext(data: UserEventPayload): UserContext {
    return {
      schema: config.snowplow.schemas.user,
      data: {
        email: data.user.email,
        guid: data.user.guid,
        hashed_guid: data.user.hashedGuid,
        user_id: parseInt(data.user.id),
        hashed_user_id: data.user.hashedId,
      },
    };
  }

  private static generateApiUserContext(
    data: UserEventPayload
  ): ApiUserContext {
    return {
      schema: config.snowplow.schemas.apiUser,
      data: {
        api_id: parseInt(data.apiUser.apiId),
        name: data.apiUser.name,
        is_native: data.apiUser.isNative,
        is_trusted: data.apiUser.isTrusted,
        client_version: data.apiUser.clientVersion,
      },
    };
  }

  /**
   * Updates tracker with request information
   * @private
   */
  private addRequestInfoToTracker(data: UserEventPayload) {
    this.tracker.setLang(data.request?.language);
    this.tracker.setDomainUserId(data.request?.snowplowDomainUserId); // possibly grab from cookie else grab from context
    this.tracker.setIpAddress(data.request?.ipAddress); // get the remote address from teh x-forwarded-for header
    this.tracker.setUseragent(data.request?.userAgent);
  }
}
