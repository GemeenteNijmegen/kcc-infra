import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, Compatibility, ContainerImage, FargateService, Protocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { HelloWorldServiceConfiguration } from '../ConfigurationInterfaces';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';

export interface HelloWorldServiceProps {
  /**
   * Service specific configuration.
   * E.g. log level, debug enabled, immage overrides. Depends on what this service requires.
   */
  readonly serviceConfiguration: HelloWorldServiceConfiguration;
}

export class HelloWorldService extends Construct implements IContainerService {

  static readonly IMAGE = 'jmalloc/echo-server';
  static readonly CONTAINER_PORT = 80;
  static readonly HOST_PORT = 8080;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: HelloWorldServiceProps) {
    super(scope, id);

    this.id = props.serviceConfiguration.id;

  }

  /**
   * Bind the service to the container platform
   * @param platform
   */
  bind(platform: ContainerServiceProps): void {


    // Read props
    const subdomain = this.props.serviceConfiguration.subdomain;
    const priority = this.props.serviceConfiguration.priority;

    // Create the service
    const logs = this.logGroup();
    const service = this.setupService(logs, platform);


    // Create subdomain cloudfront for this services
    new SubdomainCloudfront(this, 'subdomain-cloudfront', {
      certificate: platform.wildcardCertificate,
      hostedZone: platform.hostedZone,
      loadbalancer: platform.loadbalancer.alb,
      subdomain: subdomain,
    });

    // Make the loadbalancer exposes a healthy service
    platform.loadbalancer.getListerner().addTargets(`${this.id}-targets`, {
      targets: [service],
      conditions: [
        ListenerCondition.hostHeaders([subdomain]),
      ],
      healthCheck: {
        enabled: true,
        path: '/health',
      },
      priority: priority,
    });


  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps) {

    const task = new TaskDefinition(this, 'main-task', {
      cpu: this.props.serviceConfiguration.taskSize?.cpu ?? '256',
      memoryMiB: this.props.serviceConfiguration.taskSize?.memory ?? '512',
      compatibility: Compatibility.FARGATE,
    });

    task.addContainer('helloworld', {
      image: ContainerImage.fromRegistry(HelloWorldService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [
        {
          containerPort: HelloWorldService.CONTAINER_PORT,
          hostPort: HelloWorldService.HOST_PORT,
          protocol: Protocol.TCP,
        },
      ],
      environment: {
        LOG_HTTP_HEADERS: 'true',
        LOG_HTTP_BODY: 'true',
      },
    });

    const service = new FargateService(this, 'service', {
      cluster: platform.cluster,
      taskDefinition: task,
      cloudMapOptions: {
        cloudMapNamespace: platform.namespace,
        containerPort: HelloWorldService.HOST_PORT,
        dnsRecordType: DnsRecordType.SRV,
        dnsTtl: Duration.seconds(60),
      },
      desiredCount: 1,
      enableExecuteCommand: true,
    });

    ContainerServiceUtils.allowExecutingCommands(task);

    return service;
  }


  private logGroup() {
    return new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });
  }


}
