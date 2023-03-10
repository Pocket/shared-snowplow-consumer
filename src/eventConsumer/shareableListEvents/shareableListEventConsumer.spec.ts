import { getShareableListEventPayload } from './shareableListEventConsumer';
import {
  EventType,
  ShareableListEventPayloadSnowplow,
} from '../../snowplow/shareableList/types';
import { testShareableListData } from '../../snowplow/shareableList/testData';

describe('getShareableListEventPayload', () => {
  it('should convert shareable_list_created event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_CREATED,
    };

    const requestBody = {
      'detail-type': 'shareable_list_created',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });

  it('should convert shareable_list_updated event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_UPDATED,
    };

    const requestBody = {
      'detail-type': 'shareable_list_updated',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });

  it('should convert shareable_list_deleted event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_DELETED,
    };

    const requestBody = {
      'detail-type': 'shareable_list_deleted',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });

  it('should convert shareable_list_published event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_PUBLISHED,
    };

    const requestBody = {
      'detail-type': 'shareable_list_published',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });

  it('should convert shareable_list_unpublished event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_UNPUBLISHED,
    };

    const requestBody = {
      'detail-type': 'shareable_list_unpublished',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });

  it('should convert shareable_list_hidden event request body to Snowplow ShareableList', () => {
    const shareableListCreatedEvent: ShareableListEventPayloadSnowplow = {
      shareable_list: testShareableListData,
      eventType: EventType.SHAREABLE_LIST_HIDDEN,
    };

    const requestBody = {
      'detail-type': 'shareable_list_hidden',
      source: 'shareable-list-events',
      detail: { shareableList: testShareableListData },
    };

    const payload = getShareableListEventPayload(requestBody);
    expect(payload).toEqual(shareableListCreatedEvent);
  });
});
