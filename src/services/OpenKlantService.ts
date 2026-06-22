import { Duration, Token, RemovalPolicy } from 'aws-cdk-lib';
import { SecurityGroup, ISecurityGroup, Port } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, BaseService, Compatibility, ContainerDefinition, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { Secret as SecretParameter } from 'aws-cdk-lib/aws-secretsmanager';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { OpenKlantServiceConfiguration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { IContainerService, ContainerServiceProps } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { RedisInstance } from '../constructs/Redis';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';
import { AdditionalDatabase } from '../custom-resources/additional-database/AdditionalDatabase';
import { Statics } from '../Statics';

export interface OpenKlantServiceProps {
  readonly serviceConfiguration: OpenKlantServiceConfiguration;
}

export class OpenKlantService extends Construct implements IContainerService {
  static readonly DEFAULT_IMAGE = 'maykinmedia/open-klant:2.17.0';

  static readonly MAIN_CONTAINER_PORT = 8000;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: OpenKlantServiceProps) {
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
        path: '/_healthz/livez/',
        port: isEc2 ? undefined : OpenKlantService.MAIN_CONTAINER_PORT.toString(),
      },
      priority: priority,
      port: OpenKlantService.MAIN_CONTAINER_PORT,
    });
  }

  private getEnvironmentConfiguration(platform: ContainerServiceProps, database: KccInfraAdditionalDatabase): Record<string, string> {
    const config = this.props.serviceConfiguration;

    let { environment } = this.loadEnvironmentFromConfig(config);

    const redisHost = platform.redis.db.attrRedisEndpointAddress + ':' + platform.redis.db.attrRedisEndpointPort + '/';
    const siteDomain = `${config.subdomain}.${platform.hostedZone.zoneName}`;

    const env: Record<string, string> = {
      // Add env vars from service config
      ...environment,

      DJANGO_SETTINGS_MODULE: 'openklant.conf.docker',
      DB_HOST: database.host,
      DB_PORT: database.port,
      DB_NAME: database.name,

      ALLOWED_HOSTS: '*',
      CACHE_DEFAULT: redisHost + config.redisIndexMain,
      CACHE_AXES: redisHost + config.redisIndexMain,

      EMAIL_HOST: 'localhost',
      IS_HTTPS: 'True',
      USE_X_FORWARDED_HOST: 'True',
      NUM_PROXIES: '1',
      SITE_DOMAIN: siteDomain,
      CSRF_TRUSTED_ORIGINS: `https://${siteDomain}`,

      LOG_LEVEL: 'DEBUG',
      LOG_REQUESTS: 'True',
      LOG_OUTGOING_REQUESTS_DB_SAVE: 'False',
      LOG_OUTGOING_REQUESTS_DB_SAVE_BODY: 'False',
      LOG_QUERIES: 'False',
      DEBUG: 'True',
      DISABLE_2FA: 'True',
      ENVIRONMENT: 'development',
      SESSION_COOKIE_AGE: '36000',

      CELERY_BROKER_URL: 'redis://' + redisHost + config.redisIndexCelery,
      CELERY_RESULT_BACKEND: 'redis://' + redisHost + config.redisIndexCelery,
      CELERY_LOGLEVEL: 'DEBUG',
      CELERY_WORKER_CONCURRENCY: '4',
      // Dev only
      CORS_ALLOW_ALL_ORIGINS: 'True',
      NOTIFICATIONS_DISABLED: 'True',
      ENABLE_CLOUD_EVENTS: 'False',
      OTEL_SDK_DISABLED: 'True',
    };

    return env;
  }

  private getSecretConfiguration(database: KccInfraAdditionalDatabase) {
    const secretKey = new SecretParameter(this, 'secret-key', {
      description: 'Open Klant DJANGO secret key',
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

  private setupService(logs: LogGroup, platform: ContainerServiceProps, envVars: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;
    const volumeName = 'openklant-main-temp';

    const task = new TaskDefinition(this, 'main-task', {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addVolume({ name: volumeName });

    const container = task.addContainer('openklant-main', {
      image: ContainerImage.fromRegistry(config.image?.trim() || OpenKlantService.DEFAULT_IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'main',
        logGroup: logs,
      }),
      healthCheck: {
        command: [
          'CMD-SHELL',
          `maykin-common health-check --endpoint=http://localhost:${OpenKlantService.MAIN_CONTAINER_PORT}/_healthz/livez/ --timeout=3 >> /proc/1/fd/1 2>&1`,
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        startPeriod: Duration.seconds(60),
      },
      portMappings: [{
        containerPort: OpenKlantService.MAIN_CONTAINER_PORT,
        hostPort: isEc2 ? 0 : OpenKlantService.MAIN_CONTAINER_PORT,
        protocol: Protocol.TCP,
      }],
      environment: envVars,
      secrets: secrets,
      readonlyRootFilesystem: false,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    this.setupWritableStorage(task, logs, container, volumeName, '/tmp', '/app/tmp', '/app/log');

    const cloudMapOptions = {
      cloudMapNamespace: platform.namespace,
      containerPort: OpenKlantService.MAIN_CONTAINER_PORT,
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

  private setupCeleryService(logs: LogGroup, platform: ContainerServiceProps, envVars: Record<string, string>, secrets: Record<string, Secret>) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;
    const volumeName = 'openklant-celery-temp';

    const task = new TaskDefinition(this, 'celery-task', {
      cpu: '512',
      memoryMiB: '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addVolume({ name: volumeName });

    const container = task.addContainer('openklant-celery', {
      image: ContainerImage.fromRegistry(config.image?.trim() || OpenKlantService.DEFAULT_IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'celery',
        logGroup: logs,
      }),
      healthCheck: {
        command: [
          'CMD-SHELL',
          'maykin-common worker-health-check --broker "$CELERY_BROKER_URL" --liveness-file /app/tmp/celery_worker_event_loop.live >> /proc/1/fd/1 2>&1',
        ],
        interval: Duration.seconds(30),
        timeout: Duration.seconds(10),
        startPeriod: Duration.seconds(120),
      },
      environment: envVars,
      secrets: secrets,
      readonlyRootFilesystem: false,
      memoryReservationMiB: isEc2 ? 512 : undefined,
      command: ['/celery_worker.sh'],
    });

    this.setupWritableStorage(task, logs, container, volumeName, '/tmp', '/app/tmp', '/app/log');

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

  private setupWritableStorage(
    task: TaskDefinition,
    logs: LogGroup,
    container: ContainerDefinition,
    volumeName: string,
    ...dirs: string[]
  ) {
    ContainerServiceUtils.attachEphemeralStorage(container, volumeName, ...dirs);
    ContainerServiceUtils.setupWritableVolume(volumeName, task, logs, container, ...dirs);
  }

  private loadEnvironmentFromConfig(config: OpenKlantServiceConfiguration) {
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
    const credentials = new SecretParameter(this, 'db-credentials', {
      description: `Database credentials for the Open Klant service (${dbName})`,
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
      postgisExtension: false,
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
