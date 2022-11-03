import { EventType } from '../snowplow/user/types';

const awsEnvironments = ['production', 'development'];
let localAwsEndpoint;
if (!awsEnvironments.includes(process.env.NODE_ENV)) {
  localAwsEndpoint = process.env.AWS_ENDPOINT || 'http://localhost:4566';
}

let snowplowHttpProtocol = 'https';
if (!awsEnvironments.includes(process.env.NODE_ENV)) {
  snowplowHttpProtocol = 'http';
}

// Environment variables below are set in .aws/src/main.ts
export const config = {
  app: {
    name: 'Account Data Deletion',
    environment: process.env.NODE_ENV || 'development',
    defaultMaxAge: 86400,
    port: 4015,
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: localAwsEndpoint,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
    environment: process.env.NODE_ENV || 'development',
  },
  snowplow: {
    endpoint: process.env.SNOWPLOW_ENDPOINT || 'localhost:9090',
    httpProtocol: snowplowHttpProtocol,
    bufferSize: 1,
    retries: 3,
    appId: 'pocket-snowplow-consumer',
    events: EventType,
    schemas: {
      account: 'iglu:com.pocket/account/jsonschema/1-0-2',
      objectUpdate: 'iglu:com.pocket/object_update/jsonschema/1-0-9',
      user: 'iglu:com.pocket/user/jsonschema/1-0-0',
      apiUser: 'iglu:com.pocket/api_user/jsonschema/1-0-0',
      prospect: 'iglu:com.pocket/prospect/jsonschema/1-0-0',
    },
    appIds: {
      //todo: make the event bridge event to send this
      //or convert from event bridge's source
      prospectApi: 'pocket-prospect-api',
      userApi: 'pocket-user-api',
    },
  },
};
