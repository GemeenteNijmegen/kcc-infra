import { join } from 'path';
import { CfnOutput, Duration, Stack } from 'aws-cdk-lib';
import {
  BlockDeviceVolume,
  CloudFormationInit,
  EbsDeviceVolumeType,
  InitCommand,
  InitConfig,
  Instance,
  InstanceType,
  IVpc,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { ElasticsearchConfiguration } from '../ConfigurationInterfaces';
import { Statics } from '../Statics';

export interface ElasticsearchProps {
  vpc: IVpc;
  config: ElasticsearchConfiguration;
}

/**
 * EC2 instance running Elasticsearch 8.x
 * Intended for temporary test/development use.
 */
export class Elasticsearch extends Construct {

  constructor(scope: Construct, id: string, props: ElasticsearchProps) {
    super(scope, id);

    const esVersion = props.config.version ?? '8.17.0';
    const volumeSizeGb = props.config.volumeSizeGb ?? 30;
    const region = Stack.of(this).region;

    // Security group for the Elasticsearch instance
    const securityGroup = new SecurityGroup(this, 'elasticsearch-sg', {
      vpc: props.vpc,
      description: 'Security group for Elasticsearch EC2 instance',
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      Peer.ipv4('10.0.0.0/8'),
      Port.tcp(9200),
      'Allow Elasticsearch HTTP from private networks',
    );

    securityGroup.addIngressRule(
      Peer.ipv4('10.0.0.0/8'),
      Port.tcp(3002),
      'Allow Enterprise Search from private networks',
    );

    // IAM role for the EC2 instance
    const role = new Role(this, 'elasticsearch-instance-role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Create a secret with a generated password for the elastic user
    const elasticPasswordSecret = new Secret(this, 'elasticsearch-password', {
      secretName: `/${Statics.projectName}/kiss/elastic/password`,
      description: 'Password for the Elasticsearch elastic user',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    elasticPasswordSecret.grantRead(role);

    // Backend account Kibana uses to connect to Elasticsearch (built-in
    // `kibana_system` user, password-only - see docs/plans/kibana-elasticsearch-users.md)
    const kibanaSystemPasswordSecret = new Secret(this, 'kibana-system-password', {
      secretName: `/${Statics.projectName}/kibana/system-user/password`,
      description: 'Password for the Elasticsearch kibana_system user',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
    kibanaSystemPasswordSecret.grantRead(role);

    // Interactive login account for the Kibana web UI (native realm user,
    // not used by any ECS task - see docs/plans/kibana-elasticsearch-users.md)
    const kibanaUiAdminPasswordSecret = new Secret(this, 'kibana-ui-admin-password', {
      secretName: `/${Statics.projectName}/kibana/ui-admin/password`,
      description: 'Password for the kibana-ui-admin Elasticsearch/Kibana login user',
      generateSecretString: {
        excludePunctuation: true,
        passwordLength: 32,
      },
    });
    kibanaUiAdminPasswordSecret.grantRead(role);

    // Upload install script to S3 as an asset
    const scriptAsset = new Asset(this, 'install-script', {
      path: join(__dirname, '..', 'elasticsearch', 'install.sh'),
    });
    scriptAsset.grantRead(role);

    // UserData: download script from S3 and execute
    const userData = UserData.forLinux();
    userData.addCommands(
      'dnf install -y aws-cli',
      `export ES_VERSION="${esVersion}"`,
      `export SECRET_ID="${elasticPasswordSecret.secretName}"`,
      `export KIBANA_SYSTEM_PASSWORD_SECRET_ID="${kibanaSystemPasswordSecret.secretName}"`,
      `export KIBANA_UI_ADMIN_PASSWORD_SECRET_ID="${kibanaUiAdminPasswordSecret.secretName}"`,
      `export AWS_REGION="${region}"`,
      `aws s3 cp s3://${scriptAsset.s3BucketName}/${scriptAsset.s3ObjectKey} /tmp/install-elasticsearch.sh`,
      'chmod +x /tmp/install-elasticsearch.sh',
      '/tmp/install-elasticsearch.sh',
    );

    // Create the EC2 instance
    const instance = new Instance(this, 'elasticsearch-instance', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      instanceType: new InstanceType(props.config.instanceType ?? 't3.medium'),
      machineImage: MachineImage.genericLinux({
        'eu-central-1': props.config.amiId!,
      }),
      securityGroup,
      role,
      userData,
      blockDevices: [{
        deviceName: '/dev/xvda',
        volume: BlockDeviceVolume.ebs(volumeSizeGb, {
          volumeType: EbsDeviceVolumeType.GP3,
          encrypted: true,
        }),
      }],
      init: CloudFormationInit.fromConfigSets({
        configSets: { default: ['verify'] },
        configs: {
          verify: new InitConfig([
            InitCommand.shellCommand(
              'curl -sf -u "elastic:$(aws secretsmanager get-secret-value '
              + `--secret-id "${elasticPasswordSecret.secretName}" `
              + `--region ${region} `
              + '--query SecretString --output text)" '
              + 'http://localhost:9200/_cluster/health',
              { key: 'verify-elasticsearch' },
            ),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(15),
      },
    });

    // Store the endpoint URL in SSM for the MainStack (KissService) to reference
    new StringParameter(this, 'elasticsearch-endpoint', {
      stringValue: `http://${instance.instancePrivateIp}:9200`,
      parameterName: `/${Statics.projectName}/internal/elasticsearch/endpoint`,
      description: 'Elasticsearch base URL',
    });

    // Store the Enterprise Search URL in SSM
    new StringParameter(this, 'enterprise-search-endpoint', {
      stringValue: `http://${instance.instancePrivateIp}:3002`,
      parameterName: `/${Statics.projectName}/internal/enterprise-search/endpoint`,
      description: 'Enterprise Search base URL',
    });

    // Pointer (not the value) to where operators can find the Kibana UI login password
    new CfnOutput(this, 'kibanaUiAdminPasswordSecretName', {
      description: 'Secrets Manager secret holding the kibana-ui-admin login password',
      value: kibanaUiAdminPasswordSecret.secretName,
    });
  }
}
