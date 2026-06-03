import { IVpc, Peer, Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { ElasticsearchConfiguration } from '../ConfigurationInterfaces';

export interface ElasticsearchProps {
  vpc: IVpc;
  config: ElasticsearchConfiguration;
}

/**
 * EC2 instance running Elasticsearch 8.x
 * Intended for temporary test/development use.
 *
 * Deploying incrementally to identify ResourceExistenceCheck hook issue.
 * Full implementation backed up in Elasticsearch.full.ts.bak
 */
export class Elasticsearch extends Construct {

  constructor(scope: Construct, id: string, props: ElasticsearchProps) {
    super(scope, id);

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

    // IAM role for the EC2 instance
    new Role(this, 'elasticsearch-instance-role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });
  }
}
