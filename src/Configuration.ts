import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Configuration } from './ConfigurationInterfaces';
import { Statics } from './Statics';

const EnvironmentConfigurations: { [key: string]: Configuration } = {
  sandbox: {
    branch: 'sandbox',
    buildEnvironment: Statics.gnSandbox01,
    deploymentEnvironment: Statics.gnSandbox01,
    criticality: new Criticality('low'),
    databaseSnapshotRetentionDays: 0,
    // helloWorlServices: [
    //   {
    //     subdomain: 'hello-world',
    //     id: 'hello-world-service-1',
    //     priority: 10,
    //   }
    // ],
  },
};

/**
 * Retrieve a configuration object by passing a branch string
 *
 * **NB**: This retrieves the subobject with key `branchName`, not
 * the subobject containing the `branchName` as the value of the `branch` key
 *
 * @param branchName the branch for which to retrieve the environment
 * @returns the configuration object for this branch
 */
export function getEnvironmentConfiguration(branchName: string): Configuration {
  const conf = EnvironmentConfigurations[branchName];
  if (!conf) {
    throw Error(`No configuration found for branch ${branchName}`);
  }
  return conf;
}
