import { expect } from 'chai';
import { ObjectUpdate, EventType, shareableListEventSchema } from './types';
import { ShareableListEventHandler } from './shareableListEventHandler';
import {
  testShareableListData,
  testPartialShareableListData,
} from './testData';
import {
  resetSnowplowEvents,
  getAllSnowplowEvents,
  getGoodSnowplowEvents,
  parseSnowplowData,
} from '../testUtils';

function assertValidSnowplowObjectUpdateEvents(
  events,
  triggers: ObjectUpdate['data']['trigger'][]
) {
  const parsedEvents = events
    .map(parseSnowplowData)
    .map((parsedEvent) => parsedEvent.data);

  expect(parsedEvents).to.include.deep.members(
    triggers.map((trigger) => ({
      schema: shareableListEventSchema.objectUpdate,
      data: { trigger: trigger, object: 'shareable_list' },
    }))
  );
}

function assertShareableListSchema(eventContext) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: shareableListEventSchema.shareable_list,
      data: {
        shareable_list_external_id:
          testShareableListData.shareable_list_external_id,
        slug: testShareableListData.slug,
        title: testShareableListData.title,
        description: testShareableListData.description,
        status: testShareableListData.status,
        moderation_status: testShareableListData.moderation_status,
        moderated_by: testShareableListData.moderated_by,
        moderation_reason: testShareableListData.moderation_reason,
        created_at: testShareableListData.created_at,
        updated_at: testShareableListData.updated_at,
      },
    },
  ]);
}

function assertPartialShareableListSchema(eventContext) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: shareableListEventSchema.shareable_list,
      data: {
        shareable_list_external_id:
          testPartialShareableListData.shareable_list_external_id,
        slug: testPartialShareableListData.slug,
        title: testPartialShareableListData.title,
        status: testPartialShareableListData.status,
        moderation_status: testPartialShareableListData.moderation_status,
        created_at: testPartialShareableListData.created_at,
      },
    },
  ]);
}

const testEventData = {
  shareable_list: {
    ...testShareableListData,
  },
};

const testPartialEventData = {
  shareable_list: {
    ...testPartialShareableListData,
  },
};

describe('ShareableListEventHandler', () => {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send shareable_list_created event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_CREATED,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_CREATED]
    );
  });

  it('should send shareable_list_updated event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_UPDATED,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_UPDATED]
    );
  });

  it('should send shareable_list_deleted event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_DELETED,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_DELETED]
    );
  });

  it('should send shareable_list_published event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_PUBLISHED,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_PUBLISHED]
    );
  });

  it('should send shareable_list_unpublished event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_UNPUBLISHED,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_UNPUBLISHED]
    );
  });

  it('should send shareable_list_hidden event to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testEventData,
      eventType: EventType.SHAREABLE_LIST_HIDDEN,
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

    assertShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_HIDDEN]
    );
  });

  it('should send shareable_list_created event with missing non-required fields to snowplow', async () => {
    new ShareableListEventHandler().process({
      ...testPartialEventData,
      eventType: EventType.SHAREABLE_LIST_CREATED,
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

    assertPartialShareableListSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      [EventType.SHAREABLE_LIST_CREATED]
    );
  });
});
