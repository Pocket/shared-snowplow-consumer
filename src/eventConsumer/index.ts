//add event type as `source` from event-bridge
import { userEventConsumer } from './userEvents/userEventConsumer';

export enum EventType {
  USER_EVENT = 'user-events',
}
// Mapping of source (via event bridge message)
// to function that should be invoked to process the message
export const eventConsumer: {
  [key: string]: (message: any) => Promise<void>;
} = {
  [EventType.USER_EVENT]: userEventConsumer,
};
