import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Environment } from 'aws-cdk-lib';
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
   * Provide configuration for a number of hello world services (usually just one)
   * @default - no hello world services are deployed
   */
  helloWorlServices?: HelloWorldServiceConfiguration[];

  /**
   * Provide configuration for the OIDC mock server service
   * @default - no OIDC mock service is deployed
   */
  oidcMockServices?: OidcMockServiceConfiguration[];

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

}


export interface HelloWorldServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration { }

export interface KissServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration {
  /**
   * Environment variables for the KISS BFF application.
   * These map to the .env.local configuration values.
   * Secrets can be included here and will be treated
   * as such by ECS.
   */
  environment: Record<string, string | AppParameter>;
}

export interface OidcMockServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration { }

export interface ItaServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration {
  /**
   * Environment variables for the ITA application.
   * Secrets can be included here and will be treated
   * as such by ECS.
   */
  environment: Record<string, string | AppParameter>;
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

export interface TaskSize {
  cpu: string;
  memory: string;
}

/**
 * The compute capacity provider for the ECS cluster
 */
export type ComputeProvider = 'FARGATE' | 'EC2';
