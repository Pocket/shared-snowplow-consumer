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
  kms,
  sns,
  datasources,
  sqs,
} from '@cdktf/provider-aws';
import { config } from './config';
import { PocketPagerDuty } from '@pocket-tools/terraform-modules';
import { PagerdutyProvider } from '@cdktf/provider-pagerduty';
import { LocalProvider } from '@cdktf/provider-local';
import { ArchiveProvider } from '@cdktf/provider-archive';
import { NullProvider } from '@cdktf/provider-null';
import {
  SharedSnowplowConsumerApp,
  SharedSnowplowConsumerProps,
} from './sharedSnowplowConsumerApp';

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
    const pagerDuty = this.createPagerDuty();

    // Consume Queue - receives all events from event-bridge
    const sqsConsumeQueue = new sqs.SqsQueue(this, 'shared-event-consumer', {
      name: `${config.prefix}-SharedEventConsumer-Queue`,
      tags: config.tags,
    });

    // Dead Letter Queue (dlq) for sqs-sns subscription. \
    //also re-used for any snowplow emission failure
    const snsTopicDlq = new sqs.SqsQueue(this, 'sns-topic-dlq', {
      name: `${config.prefix}-SNS-Topics-DLQ`,
      tags: config.tags,
    });

    // Consumer Queue should be able to listen to user events
    const userEventTopicArn = `arn:aws:sns:${region.name}:${caller.accountId}:${config.eventBridge.prefix}-${config.environment}-${config.eventBridge.userTopic}`;
    this.subscribeSqsToSnsTopic(
      sqsConsumeQueue,
      snsTopicDlq,
      userEventTopicArn,
      config.eventBridge.userTopic
    );

    // Consumer Queue should be able to listen to dismiss-prospect events from prospect-api
    const prospectEventTopicArn = `arn:aws:sns:${region.name}:${caller.accountId}:${config.eventBridge.prefix}-${config.environment}-${config.eventBridge.prospectEventTopic}`;
    this.subscribeSqsToSnsTopic(
      sqsConsumeQueue,
      snsTopicDlq,
      prospectEventTopicArn,
      config.eventBridge.prospectEventTopic
    );

    // please add any additional event subscription here . . .
    const SNSTopicsSubscriptionList = [
      userEventTopicArn,
      prospectEventTopicArn,
    ];

    // assigns inline access policy for SQS and DLQ.
    // include SNS topics that we want the queue to subscribe to within this policy.
    this.createPoliciesForAccountDeletionMonitoringSqs(
      sqsConsumeQueue,
      snsTopicDlq,
      SNSTopicsSubscriptionList
    );

    // ECS app creation.
    const appProps: SharedSnowplowConsumerProps = {
      caller: caller,
      pagerDuty: pagerDuty,
      region: region,
      secretsManagerKmsAlias: this.getSecretsManagerKmsAlias(),
      snsTopic: this.getCodeDeploySnsTopic(),
      sqsConsumeQueue: sqsConsumeQueue,
      sqsDLQ: snsTopicDlq,
    };

    new SharedSnowplowConsumerApp(
      this,
      'shared-snowplow-consumer-app',
      appProps
    );
  }

  /**
   * Get the sns topic for code deploy
   * @private
   */
  private getCodeDeploySnsTopic() {
    return new sns.DataAwsSnsTopic(this, 'backend_notifications', {
      name: `Backend-${config.environment}-ChatBot`,
    });
  }

  /**
   * Get secrets manager kms alias
   * @private
   */
  private getSecretsManagerKmsAlias() {
    return new kms.DataAwsKmsAlias(this, 'kms_alias', {
      name: 'alias/aws/secretsmanager',
    });
  }

  /**
   * Create SQS subscription for the SNS.
   * @param sqsConsumeQueue SQS integrated the SQS consume queue
   * @param snsTopicArn topic the SQS wants to subscribe to.
   * @param snsTopicDlq the DLQ to which the messages will be forwarded if SQS is down
   * @param topicName topic we want to subscribe to.
   * @private
   */
  private subscribeSqsToSnsTopic(
    sqsConsumeQueue: sqs.SqsQueue,
    snsTopicDlq: sqs.SqsQueue,
    snsTopicArn: string,
    topicName: string
  ) {
    // This Topic already exists and is managed elsewhere
    return new sns.SnsTopicSubscription(this, `${topicName}-sns-subscription`, {
      topicArn: snsTopicArn,
      protocol: 'sqs',
      endpoint: sqsConsumeQueue.arn,
      redrivePolicy: JSON.stringify({
        deadLetterTargetArn: snsTopicDlq.arn,
      }),
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

  /**
   * Create inline IAM policy for the SQS and DLQ tied to the lambda
   * Note: we need to append any additional IAM policy to this.
   * Re-running this with a different iam would replace the inline access policy.
   * @param
   * @private
   */

  /**
   *
   * @param snsTopicQueue SQS that triggers the lambda
   * @param snsTopicDlq DLQ to which the messages will be forwarded if SQS is down
   * @param snsTopicArns list of SNS topic to which we want to subscribe to
   * @private
   */
  private createPoliciesForAccountDeletionMonitoringSqs(
    snsTopicQueue: sqs.SqsQueue,
    snsTopicDlq: sqs.SqsQueue,
    snsTopicArns: string[]
  ): void {
    [
      { name: 'shared-snowplow-consumer-sns-sqs', resource: snsTopicQueue },
      { name: 'shared-snowplow-consumer-sns-dlq', resource: snsTopicDlq },
    ].forEach((queue) => {
      const policy = new iam.DataAwsIamPolicyDocument(
        this,
        `${queue.name}-policy-document`,
        {
          statement: [
            {
              effect: 'Allow',
              actions: ['sqs:SendMessage'],
              resources: [queue.resource.arn],
              principals: [
                {
                  identifiers: ['sns.amazonaws.com'],
                  type: 'Service',
                },
              ],
              condition: [
                {
                  test: 'ArnLike',
                  variable: 'aws:SourceArn',
                  // add any SNS topics to this list that we want SQSes (dlq, consume) to be able to access
                  values: snsTopicArns,
                },
              ],
            },
            // add any other subscription policy for this SQS
          ],
        }
      ).json;

      new sqs.SqsQueuePolicy(this, `${queue.name}-policy`, {
        queueUrl: queue.resource.url,
        policy: policy,
      });
    });
  }
}

const app = new App();
new SnowplowSharedConsumerStack(app, config.domainPrefix);
app.synth();
