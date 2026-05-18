import { Duration, RemovalPolicy, Token } from 'aws-cdk-lib';
import { ISecurityGroup, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { Secret as SecretParameter } from 'aws-cdk-lib/aws-secretsmanager';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { ItaServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';
import { AdditionalDatabase } from '../custom-resources/additional-database/AdditionalDatabase';
import { Statics } from '../Statics';

export interface ItaServiceProps {
  readonly serviceConfiguration: ItaServiceConfiguration;
}

export class ItaService extends Construct implements IContainerService {

  static readonly IMAGE = 'ghcr.io/interne-taak-afhandeling/ita:latest';
  static readonly CONTAINER_PORT = 8000;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: ItaServiceProps) {
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

    const db = this.dbCreate(this.props.serviceConfiguration.id, platform);

    const service = this.setupService(logs, platform, db);

    this.allowDbConnectivity(service, db.securityGroup, db.port);

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
        path: '/',
        port: isEc2 ? undefined : ItaService.CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: ItaService.CONTAINER_PORT,
    });
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps, database: ItaAdditionalDatabase) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    let { environment, secrets } = this.loadEnvironmentFromConfig(config);
    environment = {
      ...environment,
      DB_HOST: database.host,
      DB_PORT: database.port,
      DB_NAME: database.name,
    };
    secrets = {
      ...secrets,
      DB_USER: Secret.fromSecretsManager(database.credentials, 'username'),
      DB_PASSWORD: Secret.fromSecretsManager(database.credentials, 'password'),
    };

    task.addContainer('ita', {
      image: ContainerImage.fromRegistry(ItaService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: ItaService.CONTAINER_PORT,
        hostPort: isEc2 ? 0 : ItaService.CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: environment,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: ItaService.CONTAINER_PORT,
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

  private loadEnvironmentFromConfig(config: ItaServiceConfiguration) {
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

  private dbCreate(dbName: string, platform: ContainerServiceProps): ItaAdditionalDatabase {
    const credentials = new SecretParameter(this, 'db-credentials', {
      description: `Database credentials for the ITA service (${dbName})`,
      secretName: Statics.databaseCredentialsName(dbName),
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: dbName,
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    const adminCredentials = SecretParameter.fromSecretNameV2(this, 'db-admin-credentials', Statics._ssmDatabaseCredentials);
    const hostname = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseHostname);
    const port = StringParameter.valueForStringParameter(this, Statics._ssmDatabasePort);
    const dbSecurityGroupId = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseSecurityGroup);
    const dbSecurityGroup = SecurityGroup.fromSecurityGroupId(this, 'db-security-group', dbSecurityGroupId);

    const dbInstance = DatabaseInstance.fromDatabaseInstanceAttributes(this, 'rds-instance', {
      instanceEndpointAddress: hostname,
      instanceIdentifier: '',
      port: Token.asNumber(port),
      securityGroups: [dbSecurityGroup],
    });

    new AdditionalDatabase(this, 'db', {
      adminCredentialsSecret: adminCredentials,
      databaseName: dbName,
      dbUserCredentialsSecret: credentials,
      instance: dbInstance,
      vpc: platform.vpc,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    return { credentials, host: hostname, port, securityGroup: dbSecurityGroup, name: dbName };
  }

  private allowDbConnectivity(service: BaseService, dbSecurityGroup: ISecurityGroup, dbPort: string) {
    service.connections.securityGroups.forEach(serviceSecurityGroup => {
      dbSecurityGroup.connections.allowFrom(serviceSecurityGroup, Port.tcp(Token.asNumber(dbPort)));
    });
  }
}

interface ItaAdditionalDatabase {
  credentials: SecretParameter;
  host: string;
  port: string;
  securityGroup: ISecurityGroup;
  name: string;
}
