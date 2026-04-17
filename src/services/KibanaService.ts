import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { KibanaServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';

export interface KibanaServiceProps {
  readonly serviceConfiguration: KibanaServiceConfiguration;
}

export class KibanaService extends Construct implements IContainerService {

  static readonly IMAGE = 'docker.elastic.co/kibana/kibana:8.17.0';
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
    platform.loadbalancer.getListerner().addTargets(`${this.id}-targets`, {
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
    });
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    const { environment, secrets } = this.loadEnvironmentFromConfig(config);

    task.addContainer('kibana', {
      image: ContainerImage.fromRegistry(KibanaService.IMAGE),
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
