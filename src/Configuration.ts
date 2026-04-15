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
    computeProvider: 'EC2',
    helloWorlServices: [
      {
        subdomain: 'hello-world',
        id: 'hello-world-service-1',
        priority: 10,
      },
    ],
    // oidcService: {
    //   id: 'oidc-server-mock',
    //   subdomain: 'oidc',
    //   priority: 20,
    //   clients: [
    //     {
    //       clientId: 'kcc-client',
    //       clientSecrets: ['kcc-client-secret'],
    //       allowedGrantTypes: ['authorization_code'],
    //       redirectUris: ['http://localhost:3000/auth/callback'],
    //       allowedScopes: ['openid', 'profile', 'email'],
    //       requirePkce: false,
    //       accessTokenLifetime: 3600,
    //     },
    //   ],
    //   users: [
    //     {
    //       subjectId: '1',
    //       username: 'testuser',
    //       password: 'testpassword',
    //       claims: [
    //         { type: 'name', value: 'Test User' },
    //         { type: 'email', value: 'test@example.com' },
    //         { type: 'rights', value: 'admin' },
    //       ],
    //     },
    //   ],
    // },
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
