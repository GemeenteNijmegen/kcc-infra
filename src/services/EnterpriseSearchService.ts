import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { EnterpriseSearchServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';

export interface EnterpriseSearchServiceProps {
  readonly serviceConfiguration: EnterpriseSearchServiceConfiguration;
}

export class EnterpriseSearchService extends Construct implements IContainerService {

  static readonly IMAGE = 'docker.elastic.co/enterprise-search/enterprise-search:8.17.0';
  static readonly CONTAINER_PORT = 3002;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: EnterpriseSearchServiceProps) {
    super(scope, id);
    this.id = props.serviceConfiguration.id;
  }

  /**
   * Enterprise Search is internal-only: registered in CloudMap for
   * service discovery but not exposed via ALB or CloudFront.
   */
  bind(platform: ContainerServiceProps): void {
    const logs = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });
    this.setupService(logs, platform);
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '1024',
      memoryMiB: config.taskSize?.memory ?? '2048',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    const { environment, secrets } = this.loadEnvironmentFromConfig(config);

    task.addContainer('enterprise-search', {
      image: ContainerImage.fromRegistry(EnterpriseSearchService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: EnterpriseSearchService.CONTAINER_PORT,
        hostPort: isEc2 ? 0 : EnterpriseSearchService.CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: environment,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 1024 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: EnterpriseSearchService.CONTAINER_PORT,
      dnsRecordType: DnsRecordType.SRV as DnsRecordType.SRV,
      dnsTtl: Duration.seconds(60),
    };

    let service: BaseService;
    if (isEc2) {
      service = new Ec2Service(this, 'service', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 0,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'service', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 0,
        enableExecuteCommand: true,
      });
    }

    ContainerServiceUtils.allowExecutingCommands(task);
    return service;
  }

  private loadEnvironmentFromConfig(config: EnterpriseSearchServiceConfiguration) {
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
