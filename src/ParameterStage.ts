import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stack, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Configurable } from './ConfigurationInterfaces';
import { Statics } from './Statics';

export interface ParameterStageProps extends StageProps, Configurable { }

/**
 * Stage for creating SSM parameters. This needs to run
 * before stages that use them.
 */
export class ParameterStage extends Stage {
  constructor(scope: Construct, id: string, props: ParameterStageProps) {
    super(scope, id, props);
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);
    Aspects.of(this).add(new PermissionsBoundaryAspect());
    new ParameterStack(this, 'stack');
  }
}

/**
 * Stack that creates ssm parameters for the application.
 * These need to be present before stacks that use them.
 */
export class ParameterStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);

    this.addDatabaseCredentials();
  }


  private addDatabaseCredentials() {
    new Secret(this, 'db-credentials', {
      description: 'Admin credentials for connecting to the database instance',
      generateSecretString: {
        excludePunctuation: true,
        secretStringTemplate: JSON.stringify({
          username: 'kcc-dba',
        }),
        generateStringKey: 'password',
      },
      secretName: Statics._ssmDatabaseCredentials,
    });
  }


}
