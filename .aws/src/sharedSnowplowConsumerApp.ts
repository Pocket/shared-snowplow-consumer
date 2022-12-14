import { Resource } from 'cdktf';
import { Construct } from 'constructs';
import { config } from './config';
import {
  PocketALBApplication,
  PocketECSCodePipeline,
  PocketPagerDuty,
} from '@pocket-tools/terraform-modules';
import { datasources, kms, sns, sqs } from '@cdktf/provider-aws';

export type SharedSnowplowConsumerProps = {
  pagerDuty: PocketPagerDuty;
  region: datasources.DataAwsRegion;
  caller: datasources.DataAwsCallerIdentity;
  secretsManagerKmsAlias: kms.DataAwsKmsAlias;
  snsTopic: sns.DataAwsSnsTopic;
};

export class SharedSnowplowConsumerApp extends Resource {
  constructor(
    scope: Construct,
    private name: string,
    private config: SharedSnowplowConsumerProps
  ) {
    super(scope, name.toLowerCase());
    const app = this.createPocketAlbApplication();
    this.createApplicationCodePipeline(app);
  }

  private createPocketAlbApplication(): PocketALBApplication {
    const { pagerDuty, region, caller, secretsManagerKmsAlias, snsTopic } =
      this.config;

    const databaseSecretsArn = `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}/READITLA_DB`;
    // Set out the DB connection details for the production (legacy) database.
    const databaseSecretEnvVars = {
      readHost: `${databaseSecretsArn}:read_host::`,
      readUser: `${databaseSecretsArn}:read_username::`,
      readPassword: `${databaseSecretsArn}:read_password::`,
      writeHost: `${databaseSecretsArn}:write_host::`,
      writeUser: `${databaseSecretsArn}:write_username::`,
      writePassword: `${databaseSecretsArn}:write_password::`,
    };

    const secretResources = [
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:Shared`,
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:Shared/*`,
      secretsManagerKmsAlias.targetKeyArn,
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}`,
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.name}/${config.environment}/*`,
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.prefix}`,
      `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:${config.prefix}/*`,
    ];

    return new PocketALBApplication(this, 'application', {
      internal: true,
      prefix: config.prefix,
      alb6CharacterPrefix: config.shortName,
      tags: config.tags,
      cdn: false,
      domain: config.domain,
      containerConfigs: [
        {
          name: 'app',
          portMappings: [
            {
              hostPort: 4015,
              containerPort: 4015,
            },
          ],
          healthCheck: {
            command: [
              'CMD-SHELL',
              'curl -f http://localhost:4015/health || exit 1',
            ],
            interval: 15,
            retries: 3,
            timeout: 5,
            startPeriod: 0,
          },
          envVars: [
            {
              name: 'NODE_ENV',
              value: process.env.NODE_ENV,
            },

            {
              name: 'SNOWPLOW_ENDPOINT',
              value: config.envVars.snowplowEndpoint,
            },
          ],
          secretEnvVars: [
            {
              name: 'SENTRY_DSN',
              valueFrom: `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}/SENTRY_DSN`,
            },
          ],
        },
        {
          name: 'xray-daemon',
          containerImage: 'amazon/aws-xray-daemon',
          repositoryCredentialsParam: `arn:aws:secretsmanager:${region.name}:${caller.accountId}:secret:Shared/DockerHub`,
          portMappings: [
            {
              hostPort: 2000,
              containerPort: 2000,
              protocol: 'udp',
            },
          ],
          command: ['--region', 'us-east-1', '--local-mode'],
        },
      ],
      codeDeploy: {
        useCodeDeploy: true,
        useCodePipeline: true,
        notifications: {
          notifyOnFailed: true,
          notifyOnStarted: false,
          notifyOnSucceeded: false,
        },
        snsNotificationTopicArn: snsTopic.arn,
      },
      exposedContainer: {
        name: 'app',
        port: 4015,
        healthCheckPath: '/health',
      },
      ecsIamConfig: {
        prefix: config.prefix,
        taskExecutionRolePolicyStatements: [
          {
            actions: ['secretsmanager:GetSecretValue', 'kms:Decrypt'],
            resources: secretResources,
            effect: 'Allow',
          },
          {
            actions: ['ssm:GetParameter*'],
            resources: [
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}`,
              `arn:aws:ssm:${region.name}:${caller.accountId}:parameter/${config.name}/${config.environment}/*`,
            ],
            effect: 'Allow',
          },
        ],
        taskRolePolicyStatements: [
          {
            actions: [
              'xray:PutTraceSegments',
              'xray:PutTelemetryRecords',
              'xray:GetSamplingRules',
              'xray:GetSamplingTargets',
              'xray:GetSamplingStatisticSummaries',
            ],
            resources: ['*'],
            effect: 'Allow',
          },
        ],
        taskExecutionDefaultAttachmentArn:
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
      },
      autoscalingConfig: {
        targetMinCapacity: 1,
        targetMaxCapacity: 5,
      },
      alarms: {
        http5xxErrorPercentage: {
          threshold: 25,
          evaluationPeriods: 4,
          period: 300, //5 mins each
          actions: [pagerDuty.snsNonCriticalAlarmTopic.arn],
        },
      },
    });
  }

  /**
   * Create CodePipeline to build and deploy terraform and ecs
   * @param app
   * @private
   */
  private createApplicationCodePipeline(app: PocketALBApplication) {
    new PocketECSCodePipeline(this, 'code-pipeline', {
      prefix: config.prefix,
      source: {
        codeStarConnectionArn: config.codePipeline.githubConnectionArn,
        repository: config.codePipeline.repository,
        branchName: config.codePipeline.branch,
      },
    });
  }
}
