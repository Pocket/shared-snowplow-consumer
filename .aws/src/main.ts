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
  datasources
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
    const sqsEventLambda = new SQSConsumerLambda(this, 'SnowplowConsumerLambda', {
      vpc: pocketVPC,
      pagerDuty,
    });

    //todo: add a event subscription,
    // probably user-merge evnet as its not being sent to snowplow yet?
    //or pick an existing event for which we have snowplow schema
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
