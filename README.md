# SharedSnowplowConsumer

shared consumer for consuming from event-bridge and emitting to snowplow 

## Folder structure
- the infrastructure code is present in `.aws`
  - to add a new event, add the sns subscription of the event to the `sqsConsumerLambda`
- the application code is in `src/lambda`
  - the `eventConsumer` contains logic to consume from event-bridge and transform them to snowplow
  - the `snowplow` folder contains handlers to send events to snowplow
- `.docker` contains local setup
- `.circleci` contains circleCI setup

## Develop Locally
```bash
npm install
npm start:dev
```

## Start docker
```bash
# npm ci not required if already up-to-date
npm ci
docker compose up
```
