import { SubnetType } from 'aws-cdk-lib/aws-ec2';
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

  private readonly cluster: Cluster;
  private readonly image: string;
  private readonly logGroup: LogGroup;
  private readonly environment: Record<string, string>;
  private readonly secrets: Record<string, Secret>;
  private readonly taskSize: { cpu: string; memory: string };

  constructor(scope: Construct, id: string, props: ElasticSyncScheduledTasksProps) {
    super(scope, id);

    const config = props.config;
    this.cluster = props.cluster;
    this.image = config.image ?? ElasticSyncScheduledTasks.DEFAULT_IMAGE;
    this.taskSize = config.taskSize ?? { cpu: '256', memory: '512' };

    // Shared log group for all sync tasks
    this.logGroup = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });

    // Resolve environment and secrets from the configuration
    const { environment, secrets } = this.loadEnvironment(config);
    this.environment = environment;
    this.secrets = secrets;

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

    this.secrets.ELASTIC_BASE_URL = Secret.fromSsmParameter(esEndpointParam);
    this.secrets.ELASTIC_PASSWORD = Secret.fromSecretsManager(esPasswordSecret);
    this.secrets.ENTERPRISE_SEARCH_BASE_URL = Secret.fromSsmParameter(entSearchEndpointParam);
    this.environment.ELASTIC_USERNAME = 'elastic';

    // Create a task per source
    for (const source of config.sources) {
      this.createScheduledTask(source);
    }
  }

  private createScheduledTask(source: { id: string; args?: string[]; schedule: string }) {
    const taskDef = new FargateTaskDefinition(this, `${source.id}-task`, {
      cpu: Number(this.taskSize.cpu),
      memoryLimitMiB: Number(this.taskSize.memory),
    });

    taskDef.addContainer(`${source.id}-container`, {
      image: ContainerImage.fromRegistry(this.image),
      logging: new AwsLogDriver({
        streamPrefix: source.id,
        logGroup: this.logGroup,
      }),
      environment: this.environment,
      secrets: this.secrets,
      command: source.args,
    });

    const rule = new Rule(this, `${source.id}-schedule`, {
      schedule: this.parseSchedule(source.schedule),
      description: `ElasticSync scheduled task for source: ${source.id}`,
    });

    rule.addTarget(new EcsTask({
      cluster: this.cluster,
      taskDefinition: taskDef,
      subnetSelection: { subnetType: SubnetType.PRIVATE_ISOLATED },
      taskCount: 1,
    }));
  }

  private parseSchedule(expression: string): Schedule {
    // If already a valid EventBridge expression, use as-is; otherwise wrap in rate()
    if (expression.startsWith('rate(') || expression.startsWith('cron(')) {
      return Schedule.expression(expression);
    }
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
