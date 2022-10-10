export const config = {
  app: {
    name: 'sendSnowplowEvent',
    environment: process.env.NODE_ENV,
  },
  endpoint:
    process.env.SHARED_SNOWPLOW_CONSUMER ||
    'https://shared-snowplow-consumer.getpocket.dev',
  sendEventPath: '/sendEvent',
  sentry: {
    // these values are inserted into the environment in
    // .aws/src/.ts
    dsn: process.env.SENTRY_DSN || '',
    release: process.env.GIT_SHA || '',
  },
};
