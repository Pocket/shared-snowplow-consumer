import { EventType } from '../snowplow/types';

const environments = ['production', 'development'];
let snowplowHttpProtocol = 'https';
if (!environments.includes(process.env.NODE_ENV)) {
  snowplowHttpProtocol = 'http';
}

export default {
  snowplow: {
    endpoint: process.env.SNOWPLOW_ENDPOINT || 'localhost:9090',
    httpProtocol: snowplowHttpProtocol,
    bufferSize: 1,
    retries: 3,
    appId: 'pocket-snowplow-consumer',
    events: EventType,
    schemas: {
      account: 'iglu:com.pocket/account/jsonschema/1-0-2',
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-4',
      user: 'iglu:com.pocket/user/jsonschema/1-0-0',
      apiUser: 'iglu:com.pocket/api_user/jsonschema/1-0-0',
    },
  },
};
