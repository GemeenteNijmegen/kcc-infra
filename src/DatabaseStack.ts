import { GemeenteNijmegenVpc } from '@gemeentenijmegen/aws-constructs';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Configurable } from './ConfigurationInterfaces';
import { Database } from './constructs/Database';
import { Statics } from './Statics';

interface DatabaseStackProps extends StackProps, Configurable { }


/**
 * Creates the database instance (only one currenlty)
 * and create the databases.
 */
export class DatabaseStack extends Stack {

  public readonly database;
  private readonly credentials;
  private readonly vpc;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    this.credentials = Secret.fromSecretNameV2(this, 'database-credentials', Statics._ssmDatabaseCredentials);
    this.vpc = new GemeenteNijmegenVpc(this, 'vpc');

    this.database = new Database(this, 'database', {
      databaseSecret: this.credentials,
      vpc: this.vpc.vpc,
      databaseSnapshotRetentionDays: props.configuration.databaseSnapshotRetentionDays ?? 35,
    });

    this.setupDatabaseManagementSecurityGroup();
  }

  private setupDatabaseManagementSecurityGroup() {
    // Create a security group
    const databaseManagementSecurityGroup = new SecurityGroup(this, 'database-management-sg', {
      securityGroupName: 'database-management',
      description: 'Allow database management tools to connect to the database',
      vpc: this.vpc.vpc,
    });

    // Allow it to connect to the database
    this.database.db.connections.allowFrom(databaseManagementSecurityGroup, Port.tcp(5432));

    // Output it for good mesures. We need to find this in case of emergency as well.
    new CfnOutput(this, 'databaseManagementSecurityGroupId', {
      value: databaseManagementSecurityGroup.securityGroupId,
    });
  }


}
