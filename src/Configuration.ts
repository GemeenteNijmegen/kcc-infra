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
        loadbalancerRulePriority: 10,
      },
    ],
    oidcMockServices: [{
      id: 'oidc-server-mock',
      subdomain: 'oidc-mock',
      loadbalancerRulePriority: 20,
    }],
    kissServices: [{
      id: 'kiss-1',
      subdomain: 'kiss',
      loadbalancerRulePriority: 30,
      taskSize: { cpu: '512', memory: '1024' },
      environment: {
        // Base settings
        ORGANISATIE_IDS: '001479179', // RSIN
        // OIDC
        OIDC_CLIENT_ID: '',
        OIDC_CLIENT_SECRET: '',
        OIDC_AUTHORITY: '',
        OIDC_MEDEWERKER_IDENTIFICATIE_CLAIM: '',
        OIDC_MEDEWERKER_IDENTIFICATIE_TRUNCATE: '',
        // KVK
        KVK_BASE_URL: 'https://api.kvk.nl/test/api',
        KVK_API_KEY: '',
        // // Haal Centraal
        // HAAL_CENTRAAL_BASE_URL: '',
        // HAAL_CENTRAAL_API_KEY: '',
        // Enterprise Search / Elastic
        // ENTERPRISE_SEARCH_ENGINE: 'kiss-engine',
        // ENTERPRISE_SEARCH_BASE_URL: '',
        // ENTERPRISE_SEARCH_PUBLIC_API_KEY: '',
        // ENTERPRISE_SEARCH_PRIVATE_API_KEY: '',
        // ELASTIC_USERNAME: '',
        // ELASTIC_PASSWORD: '',
        // ELASTIC_BASE_URL: '',
        // // SDG
        // SDG_BASE_URL: '',
        // SDG_API_KEY: '',
        // // Klanten
        // KLANTEN_BASE_URL: '',
        // KLANTEN_CLIENT_ID: '',
        // KLANTEN_CLIENT_SECRET: '',
        // // Klantinteracties
        // KLANTINTERACTIES_BASE_URL: '',
        // KLANTINTERACTIES_TOKEN: '',
        // // Contactmomenten
        // CONTACTMOMENTEN_BASE_URL: '',
        // CONTACTMOMENTEN_API_KEY: '',
        // CONTACTMOMENTEN_API_CLIENT_ID: '',
        // // Email
        // EMAIL_HOST: '',
        // EMAIL_PORT: '',
        // EMAIL_USERNAME: '',
        // EMAIL_PASSWORD: '',
        // EMAIL_ENABLE_SSL: '',
        // FEEDBACK_EMAIL_FROM: '',
        // FEEDBACK_EMAIL_TO: '',
        // // Interne Taak
        // INTERNE_TAAK_BASE_URL: '',
        // INTERNE_TAAK_TOKEN: '',
        // INTERNE_TAAK_OBJECT_TYPE_URL: '',
        // // Afdelingen
        // AFDELINGEN_BASE_URL: '',
        // AFDELINGEN_TOKEN: '',
        // AFDELINGEN_OBJECT_TYPE_URL: '',
        // // Groepen
        // GROEPEN_BASE_URL: '',
        // GROEPEN_TOKEN: '',
        // GROEPEN_OBJECT_TYPE_URL: '',
        // // Registers
        // REGISTERS__0__IS_DEFAULT: 'true',
        // REGISTERS__0__KLANTINTERACTIE_BASE_URL: '',
        // REGISTERS__0__REGISTRY_VERSION: 'OpenKlant2',
        // REGISTERS__0__KLANTINTERACTIE_TOKEN: '',
        // REGISTERS__0__ZAAKSYSTEEM_BASE_URL: '',
        // REGISTERS__0__ZAAKSYSTEEM_API_KEY: '',
        // REGISTERS__0__ZAAKSYSTEEM_API_CLIENT_ID: '',
        // REGISTERS__0__ZAAKSYSTEEM_DEEPLINK_URL: '',
        // REGISTERS__0__ZAAKSYSTEEM_DEEPLINK_PROPERTY: 'identificatie',
      },
    }],
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
