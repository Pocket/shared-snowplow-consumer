import isomorphicFetch from 'isomorphic-fetch';
import fetchRetry from 'fetch-retry';
import { config } from './config';

const fetch = fetchRetry(isomorphicFetch);

/**
 * Generic post builder with retry logic
 * https://www.npmjs.com/package/fetch-retry
 * @param body post body
 * @param path the path to post to
 * @param endpoint the endpoint of the API
 * @returns the fetch response Promise
 */
async function postRequest(
  body: any,
  path: string,
  endpoint?: string
): Promise<any> {
  const fetchPath = (endpoint ?? config.endpoint) + path;
  return fetch(fetchPath, {
    retryOn: [500, 502, 503],
    retryDelay: (attempt, error, response) => {
      return Math.pow(2, attempt) * 500;
    },
    retries: 3,
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function callSendEventEndpoint(body: any): Promise<any> {
  //todo: throw error for anything other than 2xx so we can log the message in DLQ
  return postRequest(body, config.sendEventPath, config.endpoint);
}
