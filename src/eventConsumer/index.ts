import { userEventConsumer } from './userEvents/userEventConsumer';
import { prospectEventConsumer } from './prospectEvents/prospectEventConsumer';

//any types shared between events can be added here

//add detail-type of the events from the event-bridge payload
export enum EventType {
  ACCOUNT_DELETION = 'account-deletion',
  ACCOUNT_EMAIL_UPDATED = 'account-email-updated',
  PROSPECT_DISMISS = 'prospect-dismiss',
}

// Mapping of detail-type (via event bridge message)
// to function that should be invoked to process the message
export const eventConsumer: {
  [key: string]: (message: any) => Promise<void>;
} = {
  [EventType.ACCOUNT_DELETION]: userEventConsumer,
  [EventType.ACCOUNT_EMAIL_UPDATED]: userEventConsumer,
  [EventType.PROSPECT_DISMISS]: prospectEventConsumer,
};
