import { getProspectEventPayload } from './prospectEventConsumer';
import { ProspectEventPayloadSnowplow } from '../../snowplow/prospect/types';
import { eventBridgeTestPayload } from '../../snowplow/prospect/testData';

describe('getProspectEventPayload', () => {
  it('should convert request body to Prospect', () => {
    const expected: ProspectEventPayloadSnowplow = {
      object_version: 'new',
      prospect: eventBridgeTestPayload['prospect'],
      eventType: 'PROSPECT_REVIEWED',
    };

    const requestBody = {
      'detail-type': 'prospect-dismiss',
      source: 'prospect-events',
      detail: eventBridgeTestPayload,
    };

    const payload = getProspectEventPayload(requestBody);
    expect(payload).toEqual(expected);
  });
});
