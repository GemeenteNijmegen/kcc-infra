import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { developmentConfiguration } from './configuration/developmentConfiguration';
import { sandBoxConfiguration } from './configuration/sandBoxConfiguration';
import { Configuration } from './ConfigurationInterfaces';
import { Statics } from './Statics';

const EnvironmentConfigurations: { [key: string]: Configuration } = {
  sandbox: sandBoxConfiguration,
  development: developmentConfiguration,
  acceptance: {
    branch: 'acceptance',
    buildEnvironment: Statics.gnBuildEnvironment,
    deploymentEnvironment: Statics.gnKccAccp,
    criticality: new Criticality('medium'),
    databaseSnapshotRetentionDays: 0,
    computeProvider: 'FARGATE',
  },
  main: {
    branch: 'main',
    buildEnvironment: Statics.gnBuildEnvironment,
    deploymentEnvironment: Statics.gnKccProd,
    criticality: new Criticality('high'),
    databaseSnapshotRetentionDays: 0,
    computeProvider: 'FARGATE',
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
