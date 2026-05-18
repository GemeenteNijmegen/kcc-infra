import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Configuration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { Statics } from '../Statics';

export const developmentConfiguration = {
  branch: 'development',
  buildEnvironment: Statics.gnBuildEnvironment,
  deploymentEnvironment: Statics.gnKccDev,
  criticality: new Criticality('low'),
  databaseSnapshotRetentionDays: 0,
  computeProvider: 'FARGATE',
  helloWorlServices: [
    {
      subdomain: 'hello-world',
      id: 'hello-world-service-1',
      loadbalancerRulePriority: 10,
    },
  ],
  kissServices: [{
    id: 'kiss-1',
    subdomain: 'kiss',
    loadbalancerRulePriority: 30,
    taskSize: { cpu: '512', memory: '1024' },
    environment: {
      // Base settings
      ORGANISATIE_IDS: '001479179', // RSIN
      // Database
      // Note: database config parameters are injected in the service construct.
      // OIDC
      OIDC_CLIENT_ID: new AppParameter({
        description: 'KISS KCC: ODIC Client id',
        type: 'ssm',
        id: 'kiss-kcc-oidc-client-id',
        path: `/${Statics.projectName}/kiss/oidc/client-id`,
      }),
      OIDC_CLIENT_SECRET: new AppParameter({
        description: 'KISS KCC: ODIC Client secret',
        type: 'secret',
        id: 'kiss-kcc-oidc-client-secret',
        path: `/${Statics.projectName}/kiss/oidc/clientsecret`,
      }),
      OIDC_AUTHORITY: new AppParameter({
        description: 'KISS KCC: ODIC auhtority (without /.well-kown/..',
        type: 'ssm',
        id: 'kiss-kcc-oidc-authority',
        path: `/${Statics.projectName}/kiss/oidc/authority`,
      }),
      // OIDC_MEDEWERKER_IDENTIFICATIE_CLAIM: '',
      // OIDC_MEDEWERKER_IDENTIFICATIE_TRUNCATE: '',
      // KVK
      KVK_BASE_URL: 'https://api.kvk.nl/test/api',
      KVK_API_KEY: 'l7xx1f2691f2520d487b902f4e0b57a0b197', // Public API key: https://developers.kvk.nl/nl/documentation/testing
      // Haal Centraal
      HAAL_CENTRAAL_BASE_URL: 'https://tgbvzn1fbl.execute-api.eu-central-1.amazonaws.com/prod/personen', // Default endpoint van AWS Gateway (geen cert verplichting)
      HAAL_CENTRAAL_API_KEY: new AppParameter({
        description: 'KISS KCC: Haal Centraal BRP API key',
        type: 'secret',
        id: 'kiss-kcc-haal-centraal-api-key',
        path: `/${Statics.projectName}/kiss/haal-centraal/api-key`,
      }),
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

      // Default connections (open-klant)
      REGISTERS__0__IS_DEFAULT: 'true', // See https://kiss-klantinteractie-servicesysteem.readthedocs.io/nl/v2.1.0/decision-record/meerdere-registers.html
      REGISTERS__0__KLANTINTERACTIE_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'kiss-kcc-open-klant-url',
        description: 'KISS config: URL for Open-Klant',
        path: `/${Statics.projectName}/kiss/open-klant/base-url`,
        defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-klant/klantineracties',
      }),
      REGISTERS__0__REGISTRY_VERSION: 'OpenKlant2',
      REGISTERS__0__KLANTINTERACTIE_TOKEN: new AppParameter({
        type: 'secret',
        id: 'kiss-kcc-open-klant-api-token',
        description: 'KISS config: URL for Open-Klant API token',
        path: `/${Statics.projectName}/kiss/open-klant/api-token`,
      }),

      // Open-Zaak (formulieren)
      REGISTERS__1__IS_DEFAULT: 'false',
      REGISTERS__1__ZAAKSYSTEEM_ZAKEN_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'kiss-kcc-open-zaak-zaken-url',
        description: 'KISS config: URL for Open-Zaak Zaken (formulieren)',
        path: `/${Statics.projectName}/kiss/open-zaak-formulieren/zaken-url`,
        defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/zaken/api/v1',
      }),
      REGISTERS__1__ZAAKSYSTEEM_CATALOGI_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'kiss-kcc-open-zaak-catalogi-url',
        description: 'KISS config: URL for Open-Zaak catalogi (formulieren)',
        path: `/${Statics.projectName}/kiss/open-zaak-formulieren/catalogi-url`,
        defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/catalogi/api/v1',
      }),
      REGISTERS__1__ZAAKSYSTEEM_DOCUMENTEN_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'kiss-kcc-open-zaak-documenten-url',
        description: 'KISS config: URL for Open-Zaak documenten (formulieren)',
        path: `/${Statics.projectName}/kiss/open-zaak-formulieren/documenten-url`,
        defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/documenten/api/v1',
      }),
      REGISTERS__1__ZAAKSYSTEEM_API_CLIENT_ID: new AppParameter({
        type: 'ssm',
        id: 'kiss-kcc-open-zaak-client-id',
        description: 'KISS config: URL for Open-Zaak client id (formulieren)',
        path: `/${Statics.projectName}/kiss/open-zaak-formulieren/client-id`,
      }),
      REGISTERS__1__ZAAKSYSTEEM_API_KEY: new AppParameter({
        type: 'secret',
        id: 'kiss-kcc-open-zaak-clientsecret',
        description: 'KISS config: URL for Open-Zaak client secret (formulieren)',
        path: `/${Statics.projectName}/kiss/open-zaak-formulieren/clientsecret`,
      }),
    },
  }],
  // objectsServices: [{
  //   id: 'objects',
  //   subdomain: 'objects',
  //   loadbalancerRulePriority: 40,
  //   taskSize: { cpu: '512', memory: '1024' },
  //   image: '',
  //   environment: {}

  // }],
} as Configuration;
