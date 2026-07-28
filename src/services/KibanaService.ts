import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ApplicationProtocol, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret as SecretParameter } from 'aws-cdk-lib/aws-secretsmanager';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { KibanaServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';
import { Statics } from '../Statics';

export interface KibanaServiceProps {
  readonly serviceConfiguration: KibanaServiceConfiguration;
}

/**
 * Minimal Kibana service running as a single ECS container.
 *
 * Connects to the shared Elasticsearch EC2 instance (which runs with
 * xpack.security.enabled) using the same elastic user credentials as the
 * KISS service. Because Elasticsearch security is enabled, Kibana requires
 * a login before any data or cluster management is reachable, which is
 * what makes it acceptable to expose behind CloudFront on the public
 * internet.
 */
export class KibanaService extends Construct implements IContainerService {
  static readonly DEFAULT_IMAGE = 'docker.elastic.co/kibana/kibana:8.17.0';

  static readonly CONTAINER_PORT = 5601;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: KibanaServiceProps) {
    super(scope, id);
    this.id = props.serviceConfiguration.id;
  }

  bind(platform: ContainerServiceProps): void {
    const isEc2 = platform.computeProvider === 'EC2';
    const subdomain = this.props.serviceConfiguration.subdomain;
    const priority = this.props.serviceConfiguration.loadbalancerRulePriority;

    const logs = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });

    const service = this.setupService(logs, platform);

    new SubdomainCloudfront(this, 'subdomain-cloudfront', {
      certificate: platform.wildcardCertificate,
      hostedZone: platform.hostedZone,
      loadbalancer: platform.loadbalancer.alb,
      subdomain: subdomain,
    });

    const ruleMatchingDomain = `${subdomain}.${platform.hostedZone.zoneName}`;

    platform.loadbalancer.getListener().addTargets(`${this.id}-targets`, {
      targets: [service],
      conditions: [
        ListenerCondition.hostHeaders([ruleMatchingDomain]),
      ],
      healthCheck: {
        enabled: true,
        path: '/api/status',
        port: isEc2 ? undefined : KibanaService.CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: KibanaService.CONTAINER_PORT,
      protocol: ApplicationProtocol.HTTP,
    });
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps): BaseService {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    let { environment, secrets } = this.loadEnvironmentFromConfig(config);

    // Elasticsearch connection (endpoint owned by the Elasticsearch construct
    // in database-stack). Kibana authenticates as the built-in kibana_system
    // user - never the elastic superuser, see docs/plans/kibana-elasticsearch-users.md.
    const esEndpointParam = StringParameter.fromStringParameterName(this, 'es-endpoint', `/${Statics.projectName}/internal/elasticsearch/endpoint`);
    const kibanaSystemPasswordSecret = SecretParameter.fromSecretNameV2(this, 'kibana-system-password', `/${Statics.projectName}/kibana/system-user/password`);

    // Kibana uses this key to encrypt session cookies and saved objects.
    const encryptionKey = new SecretParameter(this, 'encryption-key', {
      description: 'Kibana session/saved-objects encryption key',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    environment = {
      ...environment,
      SERVER_HOST: '0.0.0.0',
      SERVER_PUBLICBASEURL: `https://${config.subdomain}.${platform.hostedZone.zoneName}`,
      ELASTICSEARCH_USERNAME: 'kibana_system',
    };

    secrets = {
      ...secrets,
      ELASTICSEARCH_HOSTS: Secret.fromSsmParameter(esEndpointParam),
      ELASTICSEARCH_PASSWORD: Secret.fromSecretsManager(kibanaSystemPasswordSecret),
      XPACK_SECURITY_ENCRYPTIONKEY: Secret.fromSecretsManager(encryptionKey),
    };

    task.addContainer('kibana', {
      image: ContainerImage.fromRegistry(config.image?.trim() || KibanaService.DEFAULT_IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: KibanaService.CONTAINER_PORT,
        hostPort: isEc2 ? 0 : KibanaService.CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: environment,
      secrets: secrets,
      readonlyRootFilesystem: false,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: KibanaService.CONTAINER_PORT,
      dnsRecordType: DnsRecordType.SRV as DnsRecordType.SRV,
      dnsTtl: Duration.seconds(60),
    };

    let service: BaseService;

    if (isEc2) {
      service = new Ec2Service(this, 'service', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'service', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    }

    ContainerServiceUtils.allowExecutingCommands(task);

    return service;
  }

  private loadEnvironmentFromConfig(config: KibanaServiceConfiguration) {
    const environment: Record<string, string> = {};
    const secrets: Record<string, Secret> = {};

    for (const [key, value] of Object.entries(config.environment ?? {})) {
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
