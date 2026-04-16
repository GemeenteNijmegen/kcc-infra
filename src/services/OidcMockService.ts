import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { Protocol as ALBProtocol, ApplicationProtocol, ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { OidcMockServiceConfiguration } from '../ConfigurationInterfaces';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';

export interface OidcMockServiceProps {
  readonly serviceConfiguration: OidcMockServiceConfiguration;
}

export class OidcMockService extends Construct implements IContainerService {

  static readonly IMAGE = 'ghcr.io/geigerzaehler/oidc-provider-mock:latest';
  static readonly CONTAINER_PORT = 9090;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: OidcMockServiceProps) {
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
        path: '/.well-known/openid-configuration',
        port: isEc2 ? undefined : OidcMockService.CONTAINER_PORT.toString(),
        protocol: ALBProtocol.HTTP,
      },
      priority: priority,
      port: OidcMockService.CONTAINER_PORT,
      protocol: ApplicationProtocol.HTTP,
    });
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '256',
      memoryMiB: config.taskSize?.memory ?? '512',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addContainer('oidc-provider-mock', {
      image: ContainerImage.fromRegistry(OidcMockService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: OidcMockService.CONTAINER_PORT,
        hostPort: isEc2 ? 0 : OidcMockService.CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      memoryReservationMiB: isEc2 ? 256 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: OidcMockService.CONTAINER_PORT,
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
}
