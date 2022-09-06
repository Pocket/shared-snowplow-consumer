import {
  PocketSQSWithLambdaTarget,
} from '@pocket-tools/terraform-modules';
import { Resource } from 'cdktf';
import { Construct } from 'constructs';
import { config as stackConfig } from './config';
import { PocketVPC } from '@pocket-tools/terraform-modules';
import { LAMBDA_RUNTIMES } from '@pocket-tools/terraform-modules';
import { ssm } from '@cdktf/provider-aws';
import { PocketPagerDuty } from '@pocket-tools/terraform-modules';
import { PocketVersionedLambdaProps } from '@pocket-tools/terraform-modules';

export interface SqsLambdaProps {
  vpc: PocketVPC;
  pagerDuty?: PocketPagerDuty;
  alarms?: PocketVersionedLambdaProps['lambda']['alarms'];
}

export class SQSConsumerLambda extends Resource {
  public readonly construct: PocketSQSWithLambdaTarget;

  constructor(scope: Construct, name: string, config: SqsLambdaProps) {
    super(scope, name.toLowerCase());

    const { sentryDsn, gitSha } = this.getEnvVariableValues();

    this.construct = new PocketSQSWithLambdaTarget(this, name.toLowerCase(), {
      name: `${stackConfig.prefix}-${name}`,
      batchSize: 5,
      sqsQueue: {
        maxReceiveCount: 3,
        visibilityTimeoutSeconds: 300,
      },
      functionResponseTypes: ['ReportBatchItemFailures'],
      lambda: {
        runtime: LAMBDA_RUNTIMES.NODEJS16,
        handler: 'index.handler',
        timeout: 300,
        reservedConcurrencyLimit: 10,
        environment: {
          SENTRY_DSN: sentryDsn,
          GIT_SHA: gitSha,
          ENVIRONMENT:
            stackConfig.environment === 'Prod' ? 'production' : 'development',
          SNOWPLOW_URL: stackConfig.envVars.snowplowEndpoint
        },
        vpcConfig: {
          securityGroupIds: config.vpc.defaultSecurityGroups.ids,
          subnetIds: config.vpc.privateSubnetIds,
        },
        codeDeploy: {
          region: config.vpc.region,
          accountId: config.vpc.accountId,
        },
        alarms: config.alarms,
      },
      tags: stackConfig.tags,
    });
  }

  private getEnvVariableValues() {
    const sentryDsn = new ssm.DataAwsSsmParameter(this, 'sentry-dsn', {
      name: `/${stackConfig.name}/${stackConfig.environment}/SENTRY_DSN`,
    });

    const serviceHash = new ssm.DataAwsSsmParameter(this, 'service-hash', {
      name: `${stackConfig.circleCIPrefix}/SERVICE_HASH`,
    });

    return { sentryDsn: sentryDsn.value, gitSha: serviceHash.value };
  }
}
