import fetch from 'node-fetch';
import { expect } from 'chai';
import { config } from '../../config';
import { ObjectUpdate, EventType } from './types';
import { ProspectEventHandler } from './prospectEventHandler';
import { testProspectData } from './testData';

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
      data: { trigger: trigger, object: 'prospect' },
    }))
  );
}

function assertProspectSchema(eventContext) {
  expect(eventContext.data).to.include.deep.members([
    {
      schema: config.snowplow.schemas.prospect,
      data: {
        object_version: 'new',
        prospect_id: testProspectData.prospectId,
        url: testProspectData.url,
        title: testProspectData.title,
        excerpt: testProspectData.excerpt,
        image_url: testProspectData.imageUrl,
        language: testProspectData.language,
        topic: testProspectData.topic,
        is_collection: testProspectData.isCollection,
        is_syndicated: testProspectData.isSyndicated,
        authors: testProspectData.authors.split(','),
        publisher: testProspectData.publisher,
        domain: testProspectData.domain,
        prospect_source: testProspectData.prospectType,
        scheduled_surface_id: testProspectData.scheduledSurfaceGuid,
        created_at: testProspectData.createdAt,
        reviewed_by: testProspectData.reviewedBy,
        reviewed_at: testProspectData.reviewedAt,
        prospect_review_status: testProspectData.prospectReviewStatus,
      },
    },
  ]);
}

const testEventData = {
  object_version: 'new',
  prospect: {
    ...testProspectData,
  },
};

describe('ProspectEventHandler', () => {
  beforeEach(async () => {
    await resetSnowplowEvents();
  });

  it('should send prospectEvent to snowplow ', async () => {
    new ProspectEventHandler().process({
      ...testEventData,
      eventType: EventType.PROSPECT_REVIEWED,
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

    assertProspectSchema(eventContext);

    assertValidSnowplowObjectUpdateEvents(
      goodEvents.map((goodEvent) => goodEvent.rawEvent.parameters.ue_px),
      ['prospect_reviewed']
    );
  });
});
