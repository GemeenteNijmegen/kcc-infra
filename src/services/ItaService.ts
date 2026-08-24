import { Duration, RemovalPolicy, Token } from 'aws-cdk-lib';
import { CachePolicy, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ISecurityGroup, Port, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, BaseService, Compatibility, ContainerImage, Ec2Service, FargateService, Protocol, Secret, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { BlockPublicAccess, Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Schedule, ScheduleExpression } from 'aws-cdk-lib/aws-scheduler';
import { EcsRunEc2Task, EcsRunFargateTask } from 'aws-cdk-lib/aws-scheduler-targets';
import { Secret as SecretParameter } from 'aws-cdk-lib/aws-secretsmanager';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { join } from 'path';
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

interface PollerConfiguration {
  id: string;
  schedule: ScheduleExpression;
  mode: string;
}

export class ItaService extends Construct implements IContainerService {

  static readonly WEB_CONTAINER_PORT = 8080;

  readonly id: string;

  readonly logs: LogGroup;

  constructor(scope: Construct, id: string, private props: ItaServiceProps) {
    super(scope, id);
    this.id = props.serviceConfiguration.id;

    this.logs = new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });

  }

  bind(platform: ContainerServiceProps): void {
    const isEc2 = platform.computeProvider === 'EC2';

    const subdomain = this.props.serviceConfiguration.subdomain;
    const priority = this.props.serviceConfiguration.loadbalancerRulePriority;

    const db = this.dbCreate(this.props.serviceConfiguration.id, platform);
    const secrets = this.getSecretConfig(db);
    const environment = this.getEnvironmentConfig();

    const webService = this.setupWebService(platform, environment, secrets);
    const takenNotificationsService = this.setupPollerService(platform, environment, secrets, {
      mode: 'nieuwe-internetaak-notificatie',
      id: 'taken',
      schedule: this.props.serviceConfiguration.taskNotificationsSchedule,
    });
    const reminderNotificationsService = this.setupPollerService(platform, environment, secrets, {
      mode: 'verlopen-contactverzoek-herinnering-notificatie',
      id: 'reminders',
      schedule: this.props.serviceConfiguration.reminderNotificationsSchedule,
    });

    this.allowDbConnectivity(webService.connections.securityGroups, db.securityGroup, db.port);
    this.allowDbConnectivity(takenNotificationsService.securityGroups ?? [], db.securityGroup, db.port);
    this.allowDbConnectivity(reminderNotificationsService.securityGroups ?? [], db.securityGroup, db.port);

    const staticAssetsBucket = this.setupStaticAssets();

    new SubdomainCloudfront(this, 'subdomain-cloudfront', {
      certificate: platform.wildcardCertificate,
      hostedZone: platform.hostedZone,
      loadbalancer: platform.loadbalancer.alb,
      subdomain: subdomain,
      additionalBehaviors: {
        'css/*': {
          origin: S3BucketOrigin.withOriginAccessControl(staticAssetsBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        },
      },
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


  private setupWebService(platform: ContainerServiceProps, environment: Record<string, string>, secrets: Record<string, Secret>) {
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
        logGroup: this.logs,
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

  private setupPollerService(
    platform: ContainerServiceProps,
    environment: Record<string, string>,
    secrets: Record<string, Secret>,
    pollerConfig: PollerConfiguration,
  ) {
    const isEc2 = platform.computeProvider === 'EC2';
    const config = this.props.serviceConfiguration;

    const task = new TaskDefinition(this, `${pollerConfig.id}-task`, {
      cpu: config.taskSize?.cpu ?? '512',
      memoryMiB: config.taskSize?.memory ?? '1024',
      compatibility: isEc2 ? Compatibility.EC2 : Compatibility.FARGATE,
    });

    task.addContainer(`${pollerConfig.id}-notifications`, {
      image: ContainerImage.fromRegistry(this.props.serviceConfiguration.imagePoller),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: this.logs,
      }),
      environment: {
        POLLER_MODE: pollerConfig.mode,
        ...environment,
      },
      secrets: secrets,
      memoryReservationMiB: isEc2 ? 512 : undefined,
    });

    // Security group for the scheduled task, used to allow DB connectivity below
    const securityGroup = new SecurityGroup(this, `${pollerConfig.id}-sg`, {
      vpc: platform.vpc,
    });

    const targetProps = {
      taskDefinition: task,
      subnetSelection: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [securityGroup],
      taskCount: 1,
    };
    const ecsTarget = isEc2
      ? new EcsRunEc2Task(platform.cluster, targetProps)
      : new EcsRunFargateTask(platform.cluster, targetProps);

    // Run on schedule (EventBridge Scheduler, so cron schedules can carry a time zone)
    new Schedule(this, `${pollerConfig.id}-schedule-new`, {
      schedule: pollerConfig.schedule,
      target: ecsTarget,
      description: `ElasticSync scheduled task for source: ${pollerConfig.id} notifications poller`,
    });

    return { securityGroups: [securityGroup] };
  }

  /**
   * Bucket serving the static resources (e.g. custom css) exposed on the
   * ITA CloudFront distribution under the /css path. Contents are deployed
   * from src/services/ita-static in this repo.
   */
  private setupStaticAssets(): IBucket {
    const bucket = new Bucket(this, 'static-assets', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, 'static-assets-deployment', {
      sources: [
        Source.asset(join(__dirname, 'ita-static')),
        Source.asset(join('node_modules', '@gemeentenijmegen', 'font', 'ordana')),
        Source.asset(join('node_modules', '@gemeentenijmegen', 'font', 'source-sans-pro')),
      ],
      destinationBucket: bucket,
    });

    return bucket;
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

  private allowDbConnectivity(securityGroups: ISecurityGroup[], dbSecurityGroup: ISecurityGroup, dbPort: string) {
    securityGroups.forEach(serviceSecurityGroup => {
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
