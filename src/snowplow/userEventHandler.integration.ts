import fetch from 'node-fetch';
import { expect } from 'chai';
import { config } from '../config';
import { ObjectUpdate, EventType } from './types';
import { UserEventHandler } from './userEventHandler';

async function snowplowRequest(path: string, post = false): Promise<any> {
  const response = await fetch(`http://${config.snowplow.endpoint}${path}`, {
    method: post ? 'POST' : 'GET',
  });
  return await response.json();
}

async function resetSnowplowEvents(): Promise<void> {
  await snowplowRequest('/micro/reset', true);
}

async function getAllSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/all');
}

async function getGoodSnowplowEvents(): Promise<{ [key: string]: any }> {
  return snowplowRequest('/micro/good');
}

function parseSnowplowData(data: string): { [key: string]: any } {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}

function assertValidSnowplowObjectUpdateEvents(
  events,
  triggers: ObjectUpdate['trigger'][]
) {
  const parsedEvents = events
    .map(parseSnowplowData)
    .map((parsedEvent) => parsedEvent.data);

  expect(parsedEvents).to.include.deep.members(
    triggers.map((trigger) => ({
      schema: config.snowplow.schemas.objectUpdate,
      data: { trigger: trigger, object: 'account' },
    }))
  );
}

function assertAccountDeleteSchema(eventContext) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: config.snowplow.schemas.account,
      data: {
        object_version: 'new',
        user_id: parseInt(testAccountData.id),
      },
    },
  ]);
}

function assertAccountSchema(eventContext) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: config.snowplow.schemas.account,
      data: {
        object_version: 'new',
        user_id: parseInt(testAccountData.id),
        emails: [testAccountData.email],
      },
    },
  ]);
}

function assertApiAndUserSchema(eventContext: { [p: string]: any }) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: config.snowplow.schemas.user,
      data: {
        user_id: parseInt(testEventData.user.id),
        hashed_user_id: testAccountData.hashedId,
        email: testAccountData.email,
      },
    },
    {
      schema: config.snowplow.schemas.apiUser,
      data: { api_id: parseInt(testEventData.apiUser.apiId) },
    },
  ]);
}

const testAccountData = {
  id: '1',
  hashedId: 'test_hashed_user_id',
  email: 'test@pocket.com',
  isPremium: true,
};

const testEventData = {
  user: {
    ...testAccountData,
  },
  apiUser: { apiId: '1' },
};

describe('SnowplowHandler', () => {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send account delete event to snowplow', async () => {
    await new UserEventHandler().process({
      ...testEventData,
      eventType: EventType.ACCOUNT_DELETE,
    });

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // make sure we only have good events
    const allEvents = await getAllSnowplowEvents();
    expect(allEvents.total).to.equal(1);
    expect(allEvents.good).to.equal(1);
    expect(allEvents.bad).to.equal(0);

    const goodEvents = await getGoodSnowplowEvents();
    const eventContext = parseSnowplowData(
      goodEvents[0].rawEvent.parameters.cx
    );
    assertAccountDeleteSchema(eventContext);
    assertApiAndUserSchema(eventContext);
    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['account_delete']
    );
  });

  it('should send update email event to snowplow', async () => {
    await new UserEventHandler().process({
      ...testEventData,
      eventType: EventType.ACCOUNT_EMAIL_UPDATED,
    });

    // wait a sec * 3
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // make sure we only have good events
    const allEvents = await getAllSnowplowEvents();
    expect(allEvents.total).to.equal(1);
    expect(allEvents.good).to.equal(1);
    expect(allEvents.bad).to.equal(0);

    const goodEvents = await getGoodSnowplowEvents();
    const eventContext = parseSnowplowData(
      goodEvents[0].rawEvent.parameters.cx
    );
    assertApiAndUserSchema(eventContext);
    assertAccountSchema(eventContext);
    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['account_email_updated']
    );
  });
});
