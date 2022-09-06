import { PayloadBuilder, SelfDescribingJson } from '@snowplow/tracker-core';
import * as Sentry from '@sentry/node';
import { Tracker } from '@snowplow/node-tracker';

export class EventHandler {
  constructor(protected tracker: Tracker) {
    this.tracker = tracker;
  }

  /**
   * Track snowplow event
   * @param event
   * @param context
   * @private
   */
  protected async track(
    event: PayloadBuilder,
    context: SelfDescribingJson[]
  ): Promise<void> {
    try {
      await this.tracker.track(event, context);
      console.log(
        `emitting snowplow event -> ${JSON.stringify(
          event
        )} with context -> ${JSON.stringify(context)}`
      );
    } catch (ex) {
      const message = `Failed to send event to snowplow.\n event: ${event}\n context: ${context}`;
      console.log(message);
      Sentry.addBreadcrumb({ message });
      Sentry.captureException(ex);
    }
  }
}
