import { SelfDescribingJson } from '@snowplow/tracker-core';

export const shareableListEventSchema = {
  objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-14',
  shareable_list: 'iglu:com.pocket/shareable_list/jsonschema/1-0-4',
};

export type ShareableListEventPayloadSnowplow = {
  shareable_list: ShareableList['data'];
  eventType: EventType;
};

export type ObjectUpdate = {
  schema: string;
  data: {
    trigger: EventType;
    object: 'shareable_list';
  };
};

export enum EventType {
  SHAREABLE_LIST_CREATED = 'shareable_list_created',
  SHAREABLE_LIST_UPDATED = 'shareable_list_updated',
  SHAREABLE_LIST_DELETED = 'shareable_list_deleted',
  SHAREABLE_LIST_PUBLISHED = 'shareable_list_published',
  SHAREABLE_LIST_UNPUBLISHED = 'shareable_list_unpublished',
  SHAREABLE_LIST_HIDDEN = 'shareable_list_hidden',
}

export type ShareableList = Omit<SelfDescribingJson, 'data'> & {
  data: {
    shareable_list_external_id: string;
    slug?: string;
    title: string;
    description?: string;
    status: ListStatus;
    moderation_status: ModerationStatus;
    moderated_by?: string;
    moderation_reason?: string;
    moderation_details?: string;
    created_at: number; // snowplow schema requires this field in seconds
    updated_at?: number; // snowplow schema requires this field in seconds
  };
};

export enum ListStatus {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
}

export enum ModerationStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}
