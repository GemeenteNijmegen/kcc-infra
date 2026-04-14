import { PermissionsBoundaryAspect } from '@gemeentenijmegen/aws-constructs';
import { Aspects, Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Configurable } from './ConfigurationInterfaces';
import { DatabaseStack } from './DatabaseStack';
import { MainStack } from './MainStack';
import { UsEastCertificateStack } from './UsEastStack';

interface KccInfraStageProps extends StageProps, Configurable { }

export class KccInfraStage extends Stage {

  constructor(scope: Construct, id: string, props: KccInfraStageProps) {
    super(scope, id, props);
    Aspects.of(this).add(new PermissionsBoundaryAspect());

    new UsEastCertificateStack(this, 'certificate', {
      env: { region: 'us-east-1' },
      mainRegion: props.env?.region!,
      alternativeDomainNames: props.configuration.alternativeDomainNames,
    });

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

    const kissStack = new MainStack(this, 'stack', {
      env: props.configuration.deploymentEnvironment,
      configuration: props.configuration,
    });


    kissStack.addDependency(databaseStack, 'KISS containers require database');

  }
}
