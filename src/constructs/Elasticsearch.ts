import { readFileSync } from 'fs';
import { join } from 'path';
import { Duration, Stack } from 'aws-cdk-lib';
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

    // Security group for the Elasticsearch instance
    const securityGroup = new SecurityGroup(this, 'elasticsearch-sg', {
      vpc: props.vpc,
      description: 'Security group for Elasticsearch EC2 instance',
      allowAllOutbound: true,
    });

    // Allow access on port 9200 (Elasticsearch HTTP) from within the VPC
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
    const installScript = readFileSync(join(__dirname, '..', 'elasticsearch', 'install.sh'), 'utf-8');
    const region = Stack.of(this).region;
    userData.addCommands(
      `export ES_VERSION="${esVersion}"`,
      `export SECRET_ID="${elasticPasswordSecret.secretName}"`,
      `export AWS_REGION="${region}"`,
      installScript,
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

    // Store the endpoint URL in SSM for other stacks/services to reference
    new StringParameter(this, 'elasticsearch-endpoint', {
      stringValue: `http://${instance.instancePrivateIp}:9200`,
      parameterName: `/${Statics.projectName}/internal/elasticsearch/endpoint`,
      description: 'Elasticsearch base URL',
    });
  }
}
