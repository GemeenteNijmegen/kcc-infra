import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stack, Stage, StageProps, Tags } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Configurable, Configuration } from './ConfigurationInterfaces';
import { AppParameter } from './constructs/AppParameter';
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
    new ParameterStack(this, 'stack', props.configuration);
  }
}

/**
 * Stack that creates ssm parameters for the application.
 * These need to be present before stacks that use them.
 */
export class ParameterStack extends Stack {

  constructor(scope: Construct, id: string, configuration: Configuration) {
    super(scope, id);
    Tags.of(this).add('cdkManaged', 'yes');
    Tags.of(this).add('Project', Statics.projectName);

    this.addDatabaseCredentials();
    this.createAppParameters(configuration);
  }

  private addDatabaseCredentials() {
    new Secret(this, 'db-credentials', {
      description: 'Admin credentials for connecting to the database instance',
      generateSecretString: {
        excludePunctuation: true,
        secretStringTemplate: JSON.stringify({
          username: 'kcc_dba', // should be [a-zA-Z_] (no hypen allowed at least)
        }),
        generateStringKey: 'password',
      },
      secretName: Statics._ssmDatabaseCredentials,
    });
  }

  private createAppParameters(configuration: Configuration) {
    const seen = new Set<string>();
    const scan = (obj: unknown) => {
      if (obj instanceof AppParameter) {
        if (!seen.has(obj.path)) {
          seen.add(obj.path);
          obj.create(this, `param-${obj.id}`);
        }
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach(scan);
      } else if (obj !== null && typeof obj === 'object') {
        Object.values(obj).forEach(scan);
      }
    };
    scan(configuration);
    console.log('Created AppParameters', seen);
  }


}
