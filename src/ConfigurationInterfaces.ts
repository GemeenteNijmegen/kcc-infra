import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Environment } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { AppParameter } from './constructs/AppParameter';

/**
 * Adds a configuration field to another interface
 */

export interface Configurable {
  configuration: Configuration;
}
/**
 * Basic configuration options per environment
 */

export interface Configuration {
  /**
   * Branch name for the applicible branch (this branch)
   */
  branch: string;

  /**
   * The pipeline will run from this environment
   *
   * Use this environment for your initial manual deploy
   */
  buildEnvironment: Required<Environment>;

  /**
   * Environment to deploy the application to
   *
   * The pipeline (which usually runs in the build account) will
   * deploy the application to this environment. This is usually
   * the workload AWS account in our default region.
   */
  deploymentEnvironment: Required<Environment>;

  /**
   * Base criticality for monitoring deployed for this branch.
   */
  criticality: Criticality;

  /**
   * Provie alternative domain names
   */
  alternativeDomainNames?: string[];

  /**
   * CNAME records to create for this project
   * E.g. for certificates.
   */
  cnameRecords?: Record<string, string>;

  /**
   * Configure the backup retention period in days
   * this is the standard DRS backup feature.
   * This can be configured seperately from any AWS
   * Backup plans.
   * @default 35
   */
  databaseSnapshotRetentionDays?: number;


  /**
   * The compute capacity provider for the container platform
   * @default 'FARGATE'
   */
  computeProvider?: ComputeProvider;

  /**
   * Provide configuration for the KISS frontend service
   * @default - no KISS frontend service is deployed
   */
  kissServices?: KissServiceConfiguration[];

  /**
   * Provide configuration for the ITA service
   * @default - no ITA services are deployed
   */
  itaServices?: ItaServiceConfiguration[];

  /**
   * Provide configuration for objects service
   * @default - no Objects deployed
   */
  openObjectServices?: OpenObjectServiceConfiguration[];

  /** Provide configuration for Open Klant service
 * @default - no Open Klant deployed */
  openKlantServices?: OpenKlantServiceConfiguration[];

  /**
   * Provide configuration for the Kibana service
   * @default - no Kibana service is deployed
   */
  kibanaServices?: KibanaServiceConfiguration[];

  /**
   * Provide configuration for an Elasticsearch 8.x EC2 instance
   * @default - no Elasticsearch instance is deployed
   */
  elasticsearch?: ElasticsearchConfiguration;

  /**
   * Provide configuration for ElasticSync scheduled tasks.
   * These run the KISS Elastic Sync container on a schedule to
   * keep Elasticsearch indices up-to-date.
   * @default - no ElasticSync tasks are deployed
   */
  elasticSync?: ElasticSyncConfiguration;

  /**
   * Provide configuration for WebsiteCrawler scheduled tasks.
   * These run the Open Crawler container on a schedule to crawl
   * websites into Elasticsearch.
   * @default - no WebsiteCrawler tasks are deployed
   */
  websiteCrawler?: WebsiteCrawlerConfiguration;
}

export interface KissServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration {
  /**
   * Environment variables for the KISS BFF application.
   * These map to the .env.local configuration values.
   * Secrets can be included here and will be treated
   * as such by ECS.
   */
  environment: Record<string, string | AppParameter>;

  image?: string;
}

export interface ItaServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration {
  /**
   * Environment variables for the ITA application.
   * Secrets can be included here and will be treated
   * as such by ECS.
   */
  environment: Record<string, string | AppParameter>;
  imageWebserver: string;
  imagePoller: string;
  pollerSchedule: Schedule;
}

export interface OpenObjectServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration, ContainerImageConfiguration {
  /**
   * Environment variables for the Objects application.
   * Secrets can be included here and will be treated
   * as such by ECS.
   */
  environment: Record<string, string | AppParameter>;
  /**
   * Redis indexes for main and celery
   */
  redisIndexMain: number;
  redisIndexCelery: number;
}

export interface OpenKlantServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration, ContainerImageConfiguration {
  /** Environment variables for the Open Klant application.
   * Secrets can be included here and will be treated as such by ECS.
  */
  environment: Record<string, string | AppParameter>;

  /** Redis indexes for main and celery */
  redisIndexMain: number;
  redisIndexCelery: number;
}

export interface KibanaServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration, ContainerImageConfiguration {
  /**
   * Additional environment variables for the Kibana container.
   * Secrets can be included here and will be treated as such by ECS.
   * Note: connection to Elasticsearch (host, username, password) and the
   * saved-objects encryption key are configured automatically by the service.
   * @default {}
   */
  environment?: Record<string, string | AppParameter>;
}

export interface ServiceConfiguration {
  /**
   * A identifier for this particular service
   */
  id: string;
  /**
   * Configure the subdomain to expose this service on
   */
  subdomain: string;
  /**
   * Priority for the loadbalancer rule. Must be unique across all service
   * configurations.
   */
  loadbalancerRulePriority: number;
}

export interface MainTaskSizeConfiguration {
  /**
   * Configure the task size for the main service
   * @default - cdk defaults
   */
  taskSize?: TaskSize;
}

export interface ContainerImageConfiguration {
  /**
   * Configure the container image used in the service
   * @default - cdk defaults
   */
  image?: string;
}

export interface TaskSize {
  cpu: string;
  memory: string;
}

/**
 * Configuration for an Elasticsearch 8.x EC2 instance
 */
export interface ElasticsearchConfiguration {
  /**
   * EC2 instance type for the Elasticsearch node
   * @default t3.medium
   */
  instanceType?: string;
  /**
   * EBS volume size in GB
   * @default 30
   */
  volumeSizeGb?: number;
  /**
   * Elasticsearch version to install
   * @default 8.17.0
   */
  version?: string;
  /**
   * AMI ID for the EC2 instance (AL2023).
   * Find the latest with: aws ssm get-parameter --name "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64" --region eu-central-1
   */
  amiId: string;
  /**
   * Subdomain to expose Elasticsearch on (internal only)
   * @default elasticsearch
   */
  subdomain?: string;
}

/**
 * Configuration for a single ElasticSync source (scheduled task)
 */
export interface ElasticSyncSourceConfiguration {
  /**
   * Identifier for this source.
   * Used as prefix for CDK construct IDs (task definition, EventBridge rule, log stream).
   * Must be unique across all sources within the same ElasticSync configuration.
   */
  id: string;
  /**
   * The container command arguments to select the source type.
   * Possible values: 'vac', 'smoelenboek', 'sharepoint'.
   * Omit (or leave empty) to sync SDG Producten (kennisbank). Default KISS behaviour.
   */
  args?: string[];
  /**
   * Schedule expression (EventBridge rate or cron).
   * @example 'rate(59 minutes)'
   * @example 'cron(0 * * * ? *)'
   */
  schedule: string;
}

/**
 * Configuration for ElasticSync scheduled tasks
 */
export interface ElasticSyncConfiguration {
  /**
   * Container image for the sync tool
   * @default 'ghcr.io/klantinteractie-servicesysteem/kiss-elastic-sync:latest'
   */
  image?: string;
  /**
   * Task size for sync tasks
   * @default { cpu: '256', memory: '512' }
   */
  taskSize?: TaskSize;
  /**
   * Environment variables shared across all sync tasks.
   * Secrets (AppParameter with type 'secret') will be injected via ECS secrets.
   */
  environment: Record<string, string | AppParameter>;
  /**
   * Sources to sync. Each source becomes a scheduled ECS task.
   */
  sources: ElasticSyncSourceConfiguration[];
}

/**
 * A single crawl target for the WebsiteCrawler scheduled tasks
 */
export interface WebsiteCrawlerSourceConfiguration {
  /**
   * Unique identifier for this source, used in resource ids and log stream names.
   * Must be unique across all sources within the same WebsiteCrawler configuration.
   */
  id: string;
  /**
   * Schedule expression (EventBridge rate or cron).
   * @example 'rate(1 day)'
   * @example 'cron(0 3 * * ? *)'
   */
  schedule: string;
  /**
   * Environment variables specific to this source (e.g. TARGET_URL).
   * Merged with (and overriding) the shared WebsiteCrawlerConfiguration environment.
   * Secrets (AppParameter with type 'secret') will be injected via ECS secrets.
   * OUTPUT_INDEX is derived from `id` (`search-<id>`) and set automatically —
   * do not set it here.
   */
  environment?: Record<string, string | AppParameter>;
}

/**
 * Configuration for WebsiteCrawler scheduled tasks
 */
export interface WebsiteCrawlerConfiguration {
  /**
   * Task size for crawl tasks
   * @default { cpu: '256', memory: '512' }
   */
  taskSize?: TaskSize;
  /**
   * Environment variables shared across all crawl tasks (e.g. ELASTIC_HOST,
   * ELASTIC_PORT, ELASTIC_API_KEY).
   * Secrets (AppParameter with type 'secret') will be injected via ECS secrets.
   */
  environment: Record<string, string | AppParameter>;
  /**
   * Sources to crawl. Each source becomes a scheduled ECS task.
   */
  sources: WebsiteCrawlerSourceConfiguration[];
}

/**
 * The compute capacity provider for the ECS cluster
 */
export type ComputeProvider = 'FARGATE' | 'EC2';
