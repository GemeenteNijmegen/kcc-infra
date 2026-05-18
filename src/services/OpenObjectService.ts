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
import { OpenObjectServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { RedisInstance } from '../constructs/Redis';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';
import { AdditionalDatabase } from '../custom-resources/additional-database/AdditionalDatabase';
import { Statics } from '../Statics';
export interface OpenObjectServiceProps {
  readonly serviceConfiguration: OpenObjectServiceConfiguration;
}
export class OpenObjectService extends Construct implements IContainerService {
  static readonly DEFAULT_BACKUP_IMAGE = 'maykinmedia/open-object:4.0.0';
  static readonly MAIN_CONTAINER_PORT = 8000;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: OpenObjectServiceProps) {
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


    const containerEnvironmentVars = this.getEnvironmentConfiguration(platform, db);
    const containerSecrets = this.getSecretConfiguration(db);

    const service = this.setupService(logs, platform, containerEnvironmentVars, containerSecrets);
    const celeryService = this.setupCeleryService(logs, platform, containerEnvironmentVars, containerSecrets);

    this.allowDbConnectivity(service, db.securityGroup, db.port);
    this.allowDbConnectivity(celeryService, db.securityGroup, db.port);

    this.allowRedisConnectivity(service, platform.redis);
    this.allowRedisConnectivity(celeryService, platform.redis);

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
        port: isEc2 ? undefined : OpenObjectService.MAIN_CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: OpenObjectService.MAIN_CONTAINER_PORT,
    });
  }


  private getEnvironmentConfiguration(platform: ContainerServiceProps, database: KccInfraAdditionalDatabase): Record<string, string> {

    const config = this.props.serviceConfiguration;

    let { environment } = this.loadEnvironmentFromConfig(config);
    const redisHost = platform.redis.db.attrRedisEndpointAddress + ':' + platform.redis.db.attrRedisEndpointPort + '/';
    const trustedDomains = []; // Later toevoegen
    trustedDomains.push(`${config.subdomain}.${platform.hostedZone.zoneName}`);

    const env: Record<string, string> = {

      // Add env vars from service config
      ...environment,
      DB_HOST: database.host,
      DB_PORT: database.port,
      DB_NAME: database.name,
      DJANGO_SETTINGS_MODULE: 'objects.conf.docker',
      ALLOWED_HOSTS: '*', // TODO make stricter at some point
      CACHE_DEFAULT: redisHost + config.redisIndexMain,
      CACHE_AXES: redisHost + config.redisIndexMain,
      IS_HTTPS: 'yes',
      USE_X_FORWARDED_HOST: 'True',

      // UWSGI_PORT: this.props.service.port.toString(), // Contiainer fails to start when we set a port (wsgi stuff in struct mode).
      // The default port however 8080, so we can safely remove this envvar.

      LOG_LEVEL: 'DEBUG',
      LOG_REQUESTS: 'True',
      LOG_OUTGOING_REQUESTS_DB_SAVE: 'True',
      LOG_QUERIES: 'False',
      DEBUG: 'True',
      SESSION_COOKIE_AGE: '36000',

      // Celery
      CELERY_BROKER_URL: 'redis://' + redisHost + config.redisIndexCelery,
      CELERY_RESULT_BACKEND: 'redis://' + redisHost + config.redisIndexCelery,
      CELERY_LOGLEVEL: 'DEBUG',
      CELERY_WORKER_CONCURRENCY: '4',

      // Connnectivity
      CORS_ALLOW_ALL_ORIGINS: 'True',
      CSRF_TRUSTED_ORIGINS: trustedDomains.map(domain => `https://${domain}`).join(','),

      // Disable OpenTelemetry (not used by this platform)
      OTEL_SDK_DISABLED: 'True',
    };
    return env;
  }

  /**
   * Returns all secrets for main and celery service in objects
   */
  private getSecretConfiguration(database: KccInfraAdditionalDatabase) {

    const secretKey = new SecretParameter(this, 'secret-key', {
      description: 'Open objects DJANGO secret key',
      generateSecretString: {
        excludePunctuation: true,
      },
    });
    const config = this.props.serviceConfiguration;
    let { secrets } = this.loadEnvironmentFromConfig(config);
    secrets = {
      ...secrets,
      SECRET_KEY: Secret.fromSecretsManager(secretKey),
      DB_USER: Secret.fromSecretsManager(database.credentials, 'username'),
      DB_PASSWORD: Secret.fromSecretsManager(database.credentials, 'password'),
    };
    return secrets;
  }

  // Main service
  private setupService(logs: LogGroup, platform: ContainerServiceProps, envVars: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addContainer('objects-main', {
      image: ContainerImage.fromRegistry(OpenObjectService.DEFAULT_BACKUP_IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [{
        containerPort: OpenObjectService.MAIN_CONTAINER_PORT,
        hostPort: isEc2 ? 0 : OpenObjectService.MAIN_CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: envVars,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: OpenObjectService.MAIN_CONTAINER_PORT,
      dnsRecordType: DnsRecordType.SRV as DnsRecordType.SRV,
      dnsTtl: Duration.seconds(60),
    };

    let service: BaseService;
    if (isEc2) {
      service = new Ec2Service(this, 'service-main', {
        cluster: platform.cluster,
        taskDefinition: task,
        cloudMapOptions,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'service-main', {
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


  // Main service
  private setupCeleryService(logs: LogGroup, platform: ContainerServiceProps, envVars: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, 'celery-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });


    task.addContainer('objects-celery', {
      image: ContainerImage.fromRegistry(OpenObjectService.DEFAULT_BACKUP_IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      healthCheck: {
        command: ['CMD-SHELL', 'python /app/bin/check_celery_worker_liveness.py >> /proc/1/fd/1 2>&1'],
        interval: Duration.seconds(10),
        startPeriod: Duration.seconds(60),
      },
      environment: envVars,
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
      command: ['/celery_worker.sh'],
    });

    let service: BaseService;
    if (isEc2) {
      service = new Ec2Service(this, 'service-celery', {
        cluster: platform.cluster,
        taskDefinition: task,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    } else {
      service = new FargateService(this, 'service-celery', {
        cluster: platform.cluster,
        taskDefinition: task,
        desiredCount: 1,
        enableExecuteCommand: true,
      });
    }
    ContainerServiceUtils.allowExecutingCommands(task);
    return service;
  }


  private loadEnvironmentFromConfig(config: OpenObjectServiceConfiguration) {
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


  private dbCreate(dbName: string, platform: ContainerServiceProps): KccInfraAdditionalDatabase {

    // Setup DB credentials for this db's user
    const credentials = new SecretParameter(this, 'db-credentials', {
      description: `Database credentials for the objects service (${dbName}}`,
      secretName: Statics.databaseCredentialsName(dbName),
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: dbName,
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    // Admin credentials for DB
    const adminCredentials = SecretParameter.fromSecretNameV2(this, 'db-admin-credentials', Statics._ssmDatabaseCredentials);

    // Import the RDS instance
    const hostname = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseHostname);
    const port = StringParameter.valueForStringParameter(this, Statics._ssmDatabasePort);

    // Import the RDS instance security group
    const dbSecurityGroupId = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseSecurityGroup);
    const dbSecurityGroup = SecurityGroup.fromSecurityGroupId(this, 'db-security-group', dbSecurityGroupId);

    // Wrap in an RDS instance interface
    const dbInstance = DatabaseInstance.fromDatabaseInstanceAttributes(this, 'rds-instance', {
      instanceEndpointAddress: hostname,
      instanceIdentifier: '', // Not used by AdditionalDatabase construct so leave blank
      port: Token.asNumber(port),
      securityGroups: [dbSecurityGroup],
    });

    // Creates an additional database in our RDS instance
    new AdditionalDatabase(this, 'db', {
      adminCredentialsSecret: adminCredentials,
      databaseName: dbName,
      dbUserCredentialsSecret: credentials,
      instance: dbInstance,
      vpc: platform.vpc,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    return { credentials: credentials, host: hostname, port: port, securityGroup: dbSecurityGroup, name: dbName };
  }

  private allowDbConnectivity(service: BaseService, dbSecurityGroup: ISecurityGroup, dbPort: string) {
    service.connections.securityGroups.forEach(serviceSecurityGroup => {
      dbSecurityGroup.connections.allowFrom(serviceSecurityGroup, Port.tcp(Token.asNumber(dbPort)));
    });
  }

  private allowRedisConnectivity(service: BaseService, redisInstance: RedisInstance) {
    service.connections.securityGroups.forEach(serviceSecurityGroup => {
      redisInstance.db.vpcSecurityGroupIds?.forEach((redisSecurityGroupId, index) => {
        const redisSecurityGroup = SecurityGroup.fromSecurityGroupId(this, `redis-sg-${service.node.id}-${index}`, redisSecurityGroupId);
        redisSecurityGroup.connections.allowFrom(serviceSecurityGroup, Port.tcp(Token.asNumber(redisInstance.db.attrRedisEndpointPort)));
      });
    });
  }


}


interface KccInfraAdditionalDatabase {
  credentials: SecretParameter;
  host: string;
  port: string;
  securityGroup: ISecurityGroup;
  name: string;
}
