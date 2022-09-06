import { Construct } from 'constructs';
import {
  App,
  DataTerraformRemoteState,
  RemoteBackend,
  TerraformStack,
} from 'cdktf';
import {
  AwsProvider,
  iam,
  datasources,
  sqs
} from '@cdktf/provider-aws';
import { config } from './config';
import {
  PocketVPC,
  PocketPagerDuty,
  ApplicationSqsSnsTopicSubscription,
} from '@pocket-tools/terraform-modules';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty';
import { LocalProvider } from '@cdktf/provider-local';
import { ArchiveProvider } from '@cdktf/provider-archive';
import { NullProvider } from '@cdktf/provider-null';
import { SQSConsumerLambda } from './sqsConsumerLambda';

class SnowplowSharedConsumerStack extends TerraformStack {
  constructor(scope: Construct, private name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', { region: 'us-east-1' });
    new PagerdutyProvider(this, 'pagerduty_provider', { token: undefined });
    new LocalProvider(this, 'local_provider');
    new NullProvider(this, 'null_provider');
    new ArchiveProvider(this, 'archive_provider');

    new RemoteBackend(this, {
      hostname: 'app.terraform.io',
      organization: 'Pocket',
      workspaces: [{ prefix: `${config.name}-` }],
    });

    const region = new datasources.DataAwsRegion(this, 'region');
    const caller = new datasources.DataAwsCallerIdentity(this, 'caller');
    const pocketVPC = new PocketVPC(this, 'pocket-vpc');

    const pagerDuty = this.createPagerDuty();

    // Create Lambda to consume from pocket-shared-event-bus and send it to snowplow
    const sqsEventLambda = new SQSConsumerLambda(this, 'SharedEventConsumer', {
      vpc: pocketVPC,
      pagerDuty,
    });

    const userEventTopicArn = `arn:aws:sns:${region.name}:${caller.accountId}:${config.eventBridge.prefix}-${config.environment}-${config.eventBridge.userTopic}`;
    this.subscribeSqsToSnsTopic(sqsEventLambda, userEventTopicArn);
  }

  private subscribeSqsToSnsTopic(
    sqsLambda: SQSConsumerLambda,
    snsTopicArn: string
  ) {
    // Subscribe to SNS topic with user-related events
    // This Topic already exists and is managed elsewhere
    new ApplicationSqsSnsTopicSubscription(this, 'user-event-subscription', {
      name: 'Shared-Snowplow-Consumer-Events',
      snsTopicArn,
      sqsQueue: sqsLambda.construct.sqsQueueResource,
      tags: { environment: config.environment, service: config.name },
      dependsOn: [
        sqsLambda.construct.lambda.versionedLambda,
        sqsLambda.construct.sqsQueueResource as sqs.SqsQueue,
      ],
    });
  }

  /**
   * Create PagerDuty service for alerts
   * @private
   */
  private createPagerDuty() {
    const incidentManagement = new DataTerraformRemoteState(
      this,
      'incident_management',
      {
        organization: 'Pocket',
        workspaces: {
          name: 'incident-management',
        },
      }
    );

    return new PocketPagerDuty(this, 'pagerduty', {
      prefix: config.prefix,
      service: {
        criticalEscalationPolicyId: incidentManagement
          .get('policy_backend_critical_id')
          .toString(),
        nonCriticalEscalationPolicyId: incidentManagement
          .get('policy_backend_non_critical_id')
          .toString(),
      },
    });
  }
}

const app = new App();
new SnowplowSharedConsumerStack(app, config.domainPrefix);
app.synth();
