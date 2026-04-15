import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Configurable } from './ConfigurationInterfaces';
import { DatabaseStack } from './DatabaseStack';
import { MainStack } from './MainStack';

interface KccInfraStageProps extends StageProps, Configurable { }

export class KccInfraStage extends Stage {

  constructor(scope: Construct, id: string, props: KccInfraStageProps) {
    super(scope, id, props);
    Aspects.of(this).add(new PermissionsBoundaryAspect());

    // const backupStack = new BackupStack(this, 'backup-stack', {
    //   env: props.configuration.deploymentEnvironment,
    //   configuration: props.configuration,
    // });

    const databaseStack = new DatabaseStack(this, 'database-stack', {
      env: props.configuration.deploymentEnvironment,
      configuration: props.configuration,
    });

    // const storageStack = new StorageStack(this, 'storage-stack', { configuration: props.configuration });
    // storageStack.addDependency(backupStack, 'Backup stack needs to be created first');

    const mainStack = new MainStack(this, 'stack', {
      env: props.configuration.deploymentEnvironment,
      configuration: props.configuration,
    });


    mainStack.addDependency(databaseStack, 'KISS containers require database');

  }
}
