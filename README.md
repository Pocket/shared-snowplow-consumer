# SharedSnowplowConsumer

shared consumer for consuming from event-bridge and emitting to snowplow.
Architecutre diagram: https://miro.com/app/board/uXjVO5oHq_U=/

## Folder structure
- the infrastructure code is present in `.aws`
  - to add a new event, add the sns subscription of the event to the `sqsConsumerLambda`
  - and append the SNS permissions with the existing inline access policy
  

- the `lambda` folder contains the SQSLambda code. This listens to the SNS and forward 
  the event and its payload to the ecs application to the `sendEvents` POST endpoints
  - if the ECS is down or any error thrown by sendEvents endpoint , it will forward 
    the messages to its DLQ.


- the ECS application code is in `src`. This sends the event to snowplow.
  - the `eventConsumer` contains logic to consume from event-bridge and transform them to snowplow
  - the `snowplow` folder contains handlers to send events to snowplow
- `.docker` contains local setup
- `.circleci` contains circleCI setup

## Develop Locally
```bash
npm install
npm start:dev
```

## To run test for ecs
```bash
npm ci
npm run test
npm run test-integrations
```

## To run test for lambda
```bash
cd lambda
npm ci
npm run test
npm run test-integrations
```

## Start docker
```bash
# npm ci not required if already up-to-date
npm ci
docker compose up
```
