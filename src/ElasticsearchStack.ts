import { readFileSync } from 'fs';
import { join } from 'path';
import { GemeenteNijmegenVpc } from '@gemeentenijmegen/aws-constructs';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  BlockDeviceVolume,
  CloudFormationInit,
  EbsDeviceVolumeType,
  InitCommand,
  InitConfig,
  Instance,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable, ElasticsearchConfiguration } from './ConfigurationInterfaces';
import { Statics } from './Statics';

interface ElasticsearchStackProps extends StackProps, Configurable {}

/**
 * Creates an EC2 instance running Elasticsearch 8.x
 * Intended for temporary test/development use.
 */
export class ElasticsearchStack extends Stack {

  constructor(scope: Construct, id: string, props: ElasticsearchStackProps) {
    super(scope, id, props);

    const config: ElasticsearchConfiguration = props.configuration.elasticsearch ?? {};
    const esVersion = config.version ?? '8.17.0';
    const volumeSizeGb = config.volumeSizeGb ?? 30;

    const vpc = new GemeenteNijmegenVpc(this, 'vpc');

    // Security group for the Elasticsearch instance
    const securityGroup = new SecurityGroup(this, 'elasticsearch-sg', {
      vpc: vpc.vpc,
      description: 'Security group for Elasticsearch EC2 instance',
      allowAllOutbound: true,
    });

    // Allow access on port 9200 (Elasticsearch HTTP) from within the VPC
    // Using 10.0.0.0/8 as a broad private range; the VPC is imported and CIDR is not available
    securityGroup.addIngressRule(
      Peer.ipv4('10.0.0.0/8'),
      Port.tcp(9200),
      'Allow Elasticsearch HTTP from private networks',
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

    // Allow the EC2 instance to read the secret (to set the ES password on boot)
    elasticPasswordSecret.grantRead(role);

    // UserData: load install script and inject variables
    const userData = UserData.forLinux();
    const installScript = readFileSync(join(__dirname, 'elasticsearch', 'install.sh'), 'utf-8');
    userData.addCommands(
      `export ES_VERSION="${esVersion}"`,
      `export SECRET_ID="${elasticPasswordSecret.secretName}"`,
      `export AWS_REGION="${this.region}"`,
      installScript,
    );

    // Create the EC2 instance
    const instance = new Instance(this, 'elasticsearch-instance', {
      vpc: vpc.vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      instanceType: new InstanceType(config.instanceType ?? 't3.medium'),
      machineImage: MachineImage.latestAmazonLinux2023(),
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
              + `--region ${this.region} `
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

    // Store the endpoint URL in SSM for other stacks/services to reference
    new StringParameter(this, 'elasticsearch-endpoint', {
      stringValue: `http://${instance.instancePrivateIp}:9200`,
      parameterName: `/${Statics.projectName}/internal/elasticsearch/endpoint`,
      description: 'Elasticsearch base URL',
    });
  }
}
