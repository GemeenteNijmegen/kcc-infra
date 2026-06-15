import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
  AwsLogDriver,
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
  Secret,
} from 'aws-cdk-lib/aws-ecs';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { EcsTask } from 'aws-cdk-lib/aws-events-targets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret as SecretParameter } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { ElasticSyncConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from './AppParameter';
import { Statics } from '../Statics';


export interface ElasticSyncScheduledTasksProps {
  /**
   * The ECS cluster to run tasks on
   */
  cluster: Cluster;
  /**
   * The VPC for networking
   */
  vpc: IVpc;
  /**
   * ElasticSync configuration
   */
  config: ElasticSyncConfiguration;
}

/**
 * Creates scheduled ECS tasks (via EventBridge rules) for synchronizing
 * data sources to Elasticsearch using the KISS Elastic Sync container.
 *
 * Each configured source gets its own scheduled task with the appropriate
 * container arguments (e.g. 'vac', 'smoelenboek', or no args for SDG/kennisbank).
 */
export class ElasticSyncScheduledTasks extends Construct {

  static readonly DEFAULT_IMAGE = 'ghcr.io/klantinteractie-servicesysteem/kiss-elastic-sync:latest';

  constructor(scope: Construct, id: string, props: ElasticSyncScheduledTasksProps) {
    super(scope, id);

    const config = props.config;
    const image = config.image ?? ElasticSyncScheduledTasks.DEFAULT_IMAGE;

    // Shared log group for all sync tasks
    const logGroup = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });

    // Resolve environment and secrets from the configuration
    const { environment, secrets } = this.loadEnvironment(config);

    // Add Elasticsearch connection details from SSM/Secrets Manager
    const esEndpointParam = StringParameter.fromStringParameterName(
      this, 'es-endpoint', `/${Statics.projectName}/internal/elasticsearch/endpoint`,
    );
    const esPasswordSecret = SecretParameter.fromSecretNameV2(
      this, 'es-password', `/${Statics.projectName}/kiss/elastic/password`,
    );
    const entSearchEndpointParam = StringParameter.fromStringParameterName(
      this, 'ent-search-endpoint', `/${Statics.projectName}/internal/enterprise-search/endpoint`,
    );

    secrets['ELASTIC_BASE_URL'] = Secret.fromSsmParameter(esEndpointParam);
    secrets['ELASTIC_PASSWORD'] = Secret.fromSecretsManager(esPasswordSecret);
    secrets['ENTERPRISE_SEARCH_BASE_URL'] = Secret.fromSsmParameter(entSearchEndpointParam);
    environment['ELASTIC_USERNAME'] = 'elastic';

    // Create a task per source
    for (const source of config.sources) {
      this.createScheduledTask(source.id, {
        cluster: props.cluster,
        vpc: props.vpc,
        image,
        logGroup,
        environment,
        secrets,
        args: source.args,
        schedule: source.schedule,
        taskSize: config.taskSize,
      });
    }
  }

  private createScheduledTask(
    sourceId: string,
    opts: {
      cluster: Cluster;
      vpc: IVpc;
      image: string;
      logGroup: LogGroup;
      environment: Record<string, string>;
      secrets: Record<string, Secret>;
      args?: string[];
      schedule: string;
      taskSize?: { cpu: string; memory: string };
    },
  ) {
    const cpu = opts.taskSize?.cpu ?? '256';
    const memory = opts.taskSize?.memory ?? '512';

    const taskDef = new FargateTaskDefinition(this, `${sourceId}-task`, {
      cpu: Number(cpu),
      memoryLimitMiB: Number(memory),
    });

    taskDef.addContainer(`${sourceId}-container`, {
      image: ContainerImage.fromRegistry(opts.image),
      logging: new AwsLogDriver({
        streamPrefix: sourceId,
        logGroup: opts.logGroup,
      }),
      environment: opts.environment,
      secrets: opts.secrets,
      command: opts.args, // Container ENTRYPOINT uses these as arguments
    });

    // EventBridge rule to schedule the task
    const rule = new Rule(this, `${sourceId}-schedule`, {
      schedule: this.parseSchedule(opts.schedule),
      description: `ElasticSync scheduled task for source: ${sourceId}`,
    });

    rule.addTarget(new EcsTask({
      cluster: opts.cluster,
      taskDefinition: taskDef,
      subnetSelection: { subnetType: SubnetType.PRIVATE_ISOLATED },
      taskCount: 1,
    }));
  }

  private parseSchedule(expression: string): Schedule {
    if (expression.startsWith('rate(')) {
      return Schedule.expression(expression);
    }
    if (expression.startsWith('cron(')) {
      return Schedule.expression(expression);
    }
    // Default: treat as rate expression
    return Schedule.expression(`rate(${expression})`);
  }

  private loadEnvironment(config: ElasticSyncConfiguration) {
    const environment: Record<string, string> = {};
    const secrets: Record<string, Secret> = {};

    for (const [key, value] of Object.entries(config.environment)) {
      if (value instanceof AppParameter) {
        const resolved = value.import(this, `env-${key}`);
        if (resolved.asEnv) {
          secrets[key] = Secret.fromSsmParameter(resolved.asEnv);
        }
        if (resolved.asSecret) {
          secrets[key] = Secret.fromSecretsManager(resolved.asSecret);
        }
      } else {
        environment[key] = value;
      }
    }

    return { environment, secrets };
  }
}
