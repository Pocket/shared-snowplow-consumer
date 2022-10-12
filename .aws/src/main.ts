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
    const pocketVPC = new PocketVPC(this, 'pocket-vpc');

    const pagerDuty = this.createPagerDuty();

    // Create Lambda to consume from pocket-shared-event-bus.
    //this will forward the event-bridge content to ECS.
    //if we are not successfully sending to ECS, the messages will be stored in DLQ.
    const sqsEventLambda = new SQSConsumerLambda(this, 'SharedEventConsumer', {
      vpc: pocketVPC,
      pagerDuty,
    });

    //dlq for sqs-sns subscription
    const snsTopicDlq = new sqs.SqsQueue(this, 'sns-topic-dql', {
      name: `${config.prefix}-SNS-Topics-DLQ`,
      tags: config.tags,
    });

    const userEventTopicArn = `arn:aws:sns:${region.name}:${caller.accountId}:${config.eventBridge.prefix}-${config.environment}-${config.eventBridge.userTopic}`;
    this.subscribeSqsToSnsTopic(
      sqsEventLambda,
      snsTopicDlq,
      userEventTopicArn,
      config.eventBridge.userTopic
    );

    //as of now, listens to dismiss-prospect events from prospect-api
    const prospectEventTopicArn = `arn:aws:sns:${region.name}:${caller.accountId}:${config.eventBridge.prefix}-${config.environment}-${config.eventBridge.prospectEventTopic}`;
    this.subscribeSqsToSnsTopic(
      sqsEventLambda,
      snsTopicDlq,
      prospectEventTopicArn,
      config.eventBridge.prospectEventTopic
    );

    const SNSTopicsSubscriptionList = [userEventTopicArn, prospectEventTopicArn]
    //assigns inline access policy for SQS and DLQ.
    //include sns topic that we want the queue to subscribe to within this policy.
    this.createPoliciesForAccountDeletionMonitoringSqs(
      sqsEventLambda.construct.applicationSqsQueue.sqsQueue,
      snsTopicDlq,
      SNSTopicsSubscriptionList
    );


    //ecs app creation.
    const appProps: SharedSnowplowConsumerProps = {
      pagerDuty: pagerDuty,
      region: region,
      caller: caller,
      secretsManagerKmsAlias: this.getSecretsManagerKmsAlias(),
      snsTopic: this.getCodeDeploySnsTopic(),
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
   * @param sqsLambda SQS integrated with the snowplow-consumer-lambda
   * @param snsTopicArn topic the SQS wants to subscribe to.
   * @param snsTopicDlq the DLQ to which the messages will be forwarded if SQS is down
   * @param topicName topic we want to subscribe to.
   * @private
   */
  private subscribeSqsToSnsTopic(
    sqsLambda: SQSConsumerLambda,
    snsTopicDlq: sqs.SqsQueue,
    snsTopicArn: string,
    topicName: string
  ) {
    // This Topic already exists and is managed elsewhere
    return new sns.SnsTopicSubscription(this, `${topicName}-sns-subscription`, {
      topicArn: snsTopicArn,
      protocol: 'sqs',
      endpoint: sqsLambda.construct.applicationSqsQueue.sqsQueue.arn,
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
      console.log(queue.resource.policy);
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
                  //add any sns topic to this list that we want this SQS to listen to
                  values: snsTopicArns,
                },
              ],
            },
            //add any other subscription policy for this SQS
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
