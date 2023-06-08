import { ShareableListItem } from './types';

export const testShareableListItemData: ShareableListItem['data'] = {
  shareable_list_item_external_id: 'test-shareable-list-item-external-id',
  shareable_list_external_id: 'test-shareable-list-external-id',
  given_url: 'https://test-shareable-list-item-given-url.com',
  note: 'some note',
  sort_order: 1,
  created_at: 1675978338, // 2023-02-09 16:32:18
  updated_at: 1675978338,
};

// data with missing non-required fields
export const testPartialShareableListItemData: ShareableListItem['data'] = {
  shareable_list_item_external_id: 'test-shareable-list-item-external-id',
  shareable_list_external_id: 'test-shareable-list-external-id',
  given_url: 'https://test-shareable-list-item-given-url.com',
  sort_order: 1,
  created_at: 1675978338, // 2023-02-09 16:32:18
};
