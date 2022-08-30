import * as Sentry from '@sentry/serverless';

export async function processor(event: any
): Promise<any> {
  console.log(`given event is: `+JSON.stringify(event));
  return true;
}

export const handler = Sentry.AWSLambda.wrapHandler(processor);
