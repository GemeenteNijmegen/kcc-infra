import { Duration } from 'aws-cdk-lib';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { OidcServiceConfiguration } from '../ConfigurationInterfaces';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';

export interface OidcServiceProps {
  readonly serviceConfiguration: OidcServiceConfiguration;
}

export class OidcService extends Construct implements IContainerService {

  static readonly IMAGE = 'ghcr.io/soluto/oidc-server-mock:latest';
  static readonly CONTAINER_PORT = 80;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: OidcServiceProps) {
    super(scope, id);
    this.id = props.serviceConfiguration.id;
  }

  bind(platform: ContainerServiceProps): void {
    const subdomain = this.props.serviceConfiguration.subdomain;
    const priority = this.props.serviceConfiguration.priority;

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
        port: OidcService.CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: OidcService.CONTAINER_PORT,
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

    const clientsConfig = config.clients.map(c => ({
      ClientId: c.clientId,
      ...(c.clientSecrets && { ClientSecrets: c.clientSecrets }),
      AllowedGrantTypes: c.allowedGrantTypes,
      ...(c.redirectUris && { RedirectUris: c.redirectUris }),
      AllowedScopes: c.allowedScopes,
      ...(c.requirePkce !== undefined && { RequirePkce: c.requirePkce }),
      AccessTokenLifetime: c.accessTokenLifetime ?? 3600,
      IdentityTokenLifetime: 3600,
    }));

    const usersConfig = config.users.map(u => ({
      SubjectId: u.subjectId,
      Username: u.username,
      Password: u.password,
      Claims: u.claims.map(c => ({
        Type: c.type,
        Value: c.value,
        ValueType: c.valueType ?? 'string',
      })),
    }));

    task.addContainer('oidc-server-mock', {
      image: ContainerImage.fromRegistry(OidcService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: OidcService.CONTAINER_PORT,
        hostPort: isEc2 ? 0 : OidcService.CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        SERVER_OPTIONS_INLINE: JSON.stringify({
          AccessTokenJwtType: 'JWT',
          Discovery: { ShowKeySet: true },
          Authentication: {
            CookieSameSiteMode: 'Lax',
            CheckSessionCookieSameSiteMode: 'Lax',
          },
        }),
        ASPNET_SERVICES_OPTIONS_INLINE: JSON.stringify({
          ForwardedHeadersOptions: { ForwardedHeaders: 'All' },
        }),
        CLIENTS_CONFIGURATION_INLINE: JSON.stringify(clientsConfig),
        USERS_CONFIGURATION_INLINE: JSON.stringify(usersConfig),
      },
      memoryReservationMiB: isEc2 ? 256 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: OidcService.CONTAINER_PORT,
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
