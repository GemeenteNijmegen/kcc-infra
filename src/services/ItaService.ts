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

  static readonly WEB_CONTAINER_PORT = 8080;

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
    const secrets = this.getSecretConfig(db);
    const environment = this.getEnvironmentConfig();

    const webService = this.setupWebService(logs, platform, environment, secrets);
    const pollerService = this.setupPollerService(logs, platform, environment, secrets);


    this.allowDbConnectivity(webService, db.securityGroup, db.port);
    this.allowDbConnectivity(pollerService, db.securityGroup, db.port);

    new SubdomainCloudfront(this, 'subdomain-cloudfront', {
      certificate: platform.wildcardCertificate,
      hostedZone: platform.hostedZone,
      loadbalancer: platform.loadbalancer.alb,
      subdomain: subdomain,
    });

    const ruleMatchingDomain = `${subdomain}.${platform.hostedZone.zoneName}`;
    platform.loadbalancer.getListener().addTargets(`${this.id}-targets`, {
      targets: [webService],
      conditions: [
        ListenerCondition.hostHeaders([ruleMatchingDomain]),
      ],
      healthCheck: {
        enabled: true,
        path: '/healthz',
        port: isEc2 ? undefined : ItaService.WEB_CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: ItaService.WEB_CONTAINER_PORT,
    });
  }


  private setupWebService(logs: LogGroup, platform: ContainerServiceProps, environment: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addContainer('ita', {
      image: ContainerImage.fromRegistry(this.props.serviceConfiguration.imageWebserver),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: ItaService.WEB_CONTAINER_PORT,
        hostPort: isEc2 ? 0 : ItaService.WEB_CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: environment,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: ItaService.WEB_CONTAINER_PORT,
      dnsRecordType: DnsRecordType.SRV as DnsRecordType.SRV,
      dnsTtl: Duration.seconds(60),
    };

    let service: BaseService;
    if (isEc2) {
      service = new Ec2Service(this, 'webservice', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'webservice', {
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

  // Nog uitzoeken hoe en of die poller nog aangeroepen moet worden. Eventbridge?
  private setupPollerService(logs: LogGroup, platform: ContainerServiceProps, environment: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'poller-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addContainer('ita', {
      image: ContainerImage.fromRegistry(this.props.serviceConfiguration.imagePoller),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: ItaService.WEB_CONTAINER_PORT,
        hostPort: isEc2 ? 0 : ItaService.WEB_CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: environment,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });


    let service: BaseService;
    if (isEc2) {
      service = new Ec2Service(this, 'pollerservice', {
        cluster: platform.cluster,
        taskDefinition: task,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'pollerservice', {
        cluster: platform.cluster,
        taskDefinition: task,
        desiredCount: 0, // TODO: voor nu even uit tot duidelijk is hoe deze het beste
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
  private getEnvironmentConfig(): Record<string, string> {
    let { environment } = this.loadEnvironmentFromConfig(this.props.serviceConfiguration);
    return environment;
  }
  private getSecretConfig(database: ItaAdditionalDatabase): Record<string, Secret> {
    let { secrets } = this.loadEnvironmentFromConfig(this.props.serviceConfiguration);
    secrets = {
      ...secrets,
      ConnectionStrings__DefaultConnection: Secret.fromSecretsManager(database.connectionString),
    };
    return secrets;
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

    // ITA requires a database connectionstring - voor nu handmatig vullen
    const connectionString = new SecretParameter(this, 'db-connection-string', {
      description: `Database connection string for the ITA service (${dbName})`,
      secretName: Statics.databaseConnectionStringName(dbName),
    });
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

    return { credentials, host: hostname, port, securityGroup: dbSecurityGroup, name: dbName, connectionString };
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
  connectionString: SecretParameter;
}
