import { ShareableList, ListStatus, ModerationStatus } from './types';

export const testShareableListData: ShareableList['data'] = {
  shareable_list_external_id: 'test-shareable-list-external-id',
  slug: 'test-shareable-list-slug',
  title: 'Test Shareable List Title',
  description: 'Test shareable list description',
  status: ListStatus.PUBLIC,
  moderation_status: ModerationStatus.VISIBLE,
  moderated_by: 'fake-moderator-username',
  moderation_reason: 'fake-moderator-reason',
  created_at: 1675978338, // 2023-02-09 16:32:18
  updated_at: 1675978338,
};

// data with missing non-required fields
export const testPartialShareableListData: ShareableList['data'] = {
  shareable_list_external_id: 'test-shareable-list-external-id',
  slug: 'test-shareable-list-slug',
  title: 'Test Shareable List Title',
  status: ListStatus.PUBLIC,
  moderation_status: ModerationStatus.VISIBLE,
  created_at: 1675978338, // 2023-02-09 16:32:18
};
