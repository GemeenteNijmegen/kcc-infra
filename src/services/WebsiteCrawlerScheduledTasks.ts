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
import { join } from 'path';
import { WebsiteCrawlerConfiguration, WebsiteCrawlerSourceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { Statics } from '../Statics';


export interface WebsiteCrawlerScheduledTasksProps {
  /**
   * The ECS cluster to run tasks on
   */
  cluster: Cluster;
  /**
   * WebsiteCrawler configuration
   */
  config: WebsiteCrawlerConfiguration;
}

/**
 * Creates scheduled ECS tasks (via EventBridge rules) that run the Open
 * Crawler container (built from src/containers/website-crawler) to crawl
 * websites into Elasticsearch.
 *
 * Each configured source gets its own scheduled task with the shared
 * connection environment merged with source-specific overrides (e.g.
 * TARGET_URL, OUTPUT_INDEX).
 */
export class WebsiteCrawlerScheduledTasks extends Construct {

  private readonly cluster: Cluster;
  private readonly image: ContainerImage;
  private readonly logGroup: LogGroup;
  private readonly environment: Record<string, string>;
  private readonly secrets: Record<string, Secret>;
  private readonly taskSize: { cpu: string; memory: string };

  constructor(scope: Construct, id: string, props: WebsiteCrawlerScheduledTasksProps) {
    super(scope, id);

    const config = props.config;
    this.cluster = props.cluster;
    this.image = ContainerImage.fromAsset(join(__dirname, '..', 'containers', 'website-crawler'));
    this.taskSize = config.taskSize ?? { cpu: '256', memory: '512' };

    // Shared log group for all crawl tasks
    this.logGroup = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });

    // Resolve shared environment and secrets from the configuration
    const { environment, secrets } = this.resolveEnvironment(config.environment, 'env');
    this.environment = environment;
    this.secrets = secrets;

    // Elastic search connectivity
    const esEndpointParam = StringParameter.fromStringParameterName(
      this, 'es-endpoint', `/${Statics.projectName}/internal/elasticsearch/endpoint`,
    );
    const esPasswordSecret = SecretParameter.fromSecretNameV2(
      this, 'es-password', `/${Statics.projectName}/kiss/elastic/password`,
    );
    this.secrets.ELASTIC_ENDPOINT = Secret.fromSsmParameter(esEndpointParam);
    this.secrets.ELASTIC_PASSWORD = Secret.fromSecretsManager(esPasswordSecret);
    this.environment.ELASTIC_USERNAME = 'elastic';

    // Create a task per source
    for (const source of config.sources) {
      this.createScheduledTask(source);
    }
  }

  private createScheduledTask(source: WebsiteCrawlerSourceConfiguration) {
    const { environment: sourceEnvironment, secrets: sourceSecrets } = this.resolveEnvironment(
      source.environment ?? {}, `${source.id}-env`,
    );

    const taskDef = new FargateTaskDefinition(this, `${source.id}-task`, {
      cpu: Number(this.taskSize.cpu),
      memoryLimitMiB: Number(this.taskSize.memory),
    });

    taskDef.addContainer(`${source.id}-container`, {
      image: this.image,
      logging: new AwsLogDriver({
        streamPrefix: source.id,
        logGroup: this.logGroup,
      }),
      environment: { ...this.environment, ...sourceEnvironment },
      secrets: { ...this.secrets, ...sourceSecrets },
    });

    const rule = new Rule(this, `${source.id}-schedule`, {
      schedule: this.parseSchedule(source.schedule),
      description: `WebsiteCrawler scheduled task for source: ${source.id}`,
    });

    rule.addTarget(new EcsTask({
      cluster: this.cluster,
      taskDefinition: taskDef,
      subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
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

  private resolveEnvironment(source: Record<string, string | AppParameter>, idPrefix: string) {
    const environment: Record<string, string> = {};
    const secrets: Record<string, Secret> = {};

    for (const [key, value] of Object.entries(source)) {
      if (value instanceof AppParameter) {
        const resolved = value.import(this, `${idPrefix}-${key}`);
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
