import { createAdditionalRegister } from './createAdditionalRegister';
import { AppParameter } from '../../constructs/AppParameter';
import { Statics } from '../../Statics';

const openKlantBaseUrl = new AppParameter({
  type: 'ssm',
  id: 'kiss-kcc-open-klant-url',
  description: 'KISS config: URL for Open-Klant',
  path: `/${Statics.projectName}/kiss/open-klant/base-url`,
  defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-klant/klantineracties',
});

const openKlantApiKey = new AppParameter({
  type: 'secret',
  id: 'kiss-kcc-open-klant-api-token',
  description: 'KISS config: URL for Open-Klant API token',
  path: `/${Statics.projectName}/kiss/open-klant/api-token`,
});

export const KissSharedEnvironmentConfiguration = {
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
  HAAL_CENTRAAL_BASE_URL: 'https://thisrelbni.execute-api.eu-central-1.amazonaws.com/prod', // Default endpoint van AWS Gateway (geen cert verplichting)
  HAAL_CENTRAAL_API_KEY: new AppParameter({
    description: 'KISS KCC: Haal Centraal BRP API key',
    type: 'secret',
    id: 'kiss-kcc-haal-centraal-api-key',
    path: `/${Statics.projectName}/kiss/haal-centraal/api-key`,
  }),


  // Enterprise Search / Elastic
  ENTERPRISE_SEARCH_ENGINE: 'kiss-engine',
  // Note: ENTERPRISE_SEARCH_BASE_URL, ELASTIC_USERNAME, ELASTIC_PASSWORD, and ELASTIC_BASE_URL
  // are injected directly in KissService from the Elasticsearch construct's resources.
  ENTERPRISE_SEARCH_PUBLIC_API_KEY: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-enterprise-search-public-api-key',
    description: 'KISS config: Enterprise Search public API key',
    path: `/${Statics.projectName}/kiss/elastic/enterprise-search-public-api-key`,
  }),
  ENTERPRISE_SEARCH_PRIVATE_API_KEY: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-enterprise-search-private-api-key',
    description: 'KISS config: Enterprise Search private API key',
    path: `/${Statics.projectName}/kiss/elastic/enterprise-search-private-api-key`,
  }),
  // Note: ELASTIC_USERNAME, ELASTIC_PASSWORD, and ELASTIC_BASE_URL are injected
  // directly in KissService from the Elasticsearch construct's resources.

  // Email
  EMAIL_HOST: new AppParameter({
    type: 'ssm',
    id: 'kiss-smtp-host',
    path: `/${Statics.projectName}/kiss/smtp/host`,
    description: 'KISS: SMTP host',
  }),
  EMAIL_PORT: new AppParameter({
    type: 'ssm',
    id: 'kiss-smtp-port',
    path: `/${Statics.projectName}/kiss/smtp/port`,
    description: 'KISS: SMTP port',
    defaultValue: '587',
  }),
  EMAIL_USERNAME: new AppParameter({
    type: 'ssm',
    id: 'kiss-smtp-username',
    path: `/${Statics.projectName}/kiss/smtp/username`,
    description: 'KISS: SMTP username',
  }),
  EMAIL_PASSWORD: new AppParameter({
    type: 'secret',
    id: 'kiss-smtp-password',
    path: `/${Statics.projectName}/kiss/smtp/password`,
    description: 'KISS: SMTP password',
  }),
  EMAIL_ENABLE_SSL: new AppParameter({
    type: 'ssm',
    id: 'kiss-smtp-enable-ssl',
    path: `/${Statics.projectName}/kiss/smtp/enable-ssl`,
    description: 'KISS: SMTP enable SSL',
    defaultValue: 'true',
  }),


  // Feedback email settings
  FEEDBACK_EMAIL_FROM: new AppParameter({
    type: 'ssm',
    id: 'kiss-feedback-from-email',
    path: `/${Statics.projectName}/kiss/feedback/from-email`,
    description: 'KISS: feedback from email address',
  }),
  FEEDBACK_EMAIL_TO: new AppParameter({
    type: 'ssm',
    id: 'kiss-feedback-to-email',
    path: `/${Statics.projectName}/kiss/feedback/to-email`,
    description: 'KISS: feedback to email address',
  }),

  // Afdelingen
  AFDELINGEN_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-afdelingen-objecten',
    description: 'KISS config: URL for objecten API - afdelingen',
    path: `/${Statics.projectName}/kiss/afdelingen/objecten-url`,
  }),
  AFDELINGEN_TOKEN: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-afdelingen-objecten-api-key',
    description: 'KISS config: API KEY for objecten API afdelingen',
    path: `/${Statics.projectName}/kiss/afdelingen/objecten-api-key`,
  }),
  AFDELINGEN_OBJECT_TYPE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-afdelingen-objecttype',
    description: 'KISS config: URL for objecttype for afdelingen',
    path: `/${Statics.projectName}/kiss/afdelingen/objecttypen`,
  }),

  // Groepen
  GROEPEN_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-groepen-objecten',
    description: 'KISS config: URL for objecten API - groepen',
    path: `/${Statics.projectName}/kiss/groepen/objecten-url`,
  }),
  GROEPEN_TOKEN: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-groepen-objecten-api-key',
    description: 'KISS config: API KEY for objecten API groepen',
    path: `/${Statics.projectName}/kiss/groepen/objecten-api-key`,
  }),
  GROEPEN_OBJECT_TYPE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-groepen-objecttype',
    description: 'KISS config: URL for objecttype for groepen',
    path: `/${Statics.projectName}/kiss/groepen/objecttypen`,
  }),

  // Default connections (open-klant)
  REGISTERS__0__IS_DEFAULT: 'true', // See https://kiss-klantinteractie-servicesysteem.readthedocs.io/nl/v2.1.0/decision-record/meerdere-registers.html
  REGISTERS__0__KLANTINTERACTIE_BASE_URL: openKlantBaseUrl,
  REGISTERS__0__KLANTINTERACTIE_TOKEN: openKlantApiKey,
  REGISTERS__0__REGISTRY_VERSION: 'OpenKlant2',

  // Open-Zaak (formulieren)
  REGISTERS__0__ZAAKSYSTEEM_ZAKEN_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-open-zaak-zaken-url',
    description: 'KISS config: URL for Open-Zaak Zaken (formulieren)',
    path: `/${Statics.projectName}/kiss/open-zaak-formulieren/zaken-url`,
    defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/zaken/api/v1',
  }),
  REGISTERS__0__ZAAKSYSTEEM_CATALOGI_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-open-zaak-catalogi-url',
    description: 'KISS config: URL for Open-Zaak catalogi (formulieren)',
    path: `/${Statics.projectName}/kiss/open-zaak-formulieren/catalogi-url`,
    defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/catalogi/api/v1',
  }),
  REGISTERS__0__ZAAKSYSTEEM_DOCUMENTEN_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-open-zaak-documenten-url',
    description: 'KISS config: URL for Open-Zaak documenten (formulieren)',
    path: `/${Statics.projectName}/kiss/open-zaak-formulieren/documenten-url`,
    defaultValue: 'https://mijn-services-dev.csp-nijmegen.nl/open-zaak/documenten/api/v1',
  }),
  REGISTERS__0__ZAAKSYSTEEM_API_CLIENT_ID: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-open-zaak-client-id',
    description: 'KISS config: URL for Open-Zaak client id (formulieren)',
    path: `/${Statics.projectName}/kiss/open-zaak-formulieren/client-id`,
  }),
  REGISTERS__0__ZAAKSYSTEEM_API_KEY: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-open-zaak-clientsecret',
    description: 'KISS config: URL for Open-Zaak client secret (formulieren)',
    path: `/${Statics.projectName}/kiss/open-zaak-formulieren/clientsecret`,
  }),

  // Additional register (shares the same Open-Klant instance as register 0,
  // but talks to its own zaaksysteem)
  ...createAdditionalRegister(1, {
    name: 'rxmission',
    klantinteractieBaseUrl: openKlantBaseUrl,
    klantinteractieToken: openKlantApiKey,
  }),

  // Vraag antwoord combinaties
  USE_VACS: 'true',
  VAC_OBJECTEN_BASE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-vac-objecten-base-url',
    description: 'KISS config: Base URL for VAC objecten',
    path: `/${Statics.projectName}/kiss/vac/objecten/base-url`,
    defaultValue: 'https://https://objects.kcc-dev.csp-nijmegen.nl',
  }),
  VAC_OBJECT_TYPE_URL: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-vac-objecten-objecttype-url',
    description: 'KISS config: VAC objecttype-url',
    path: `/${Statics.projectName}/kiss/vac/objecten/objecttype-url`,
    defaultValue: 'https://https://objects.kcc-dev.csp-nijmegen.nl',
  }),
  VAC_OBJECT_TYPE_VERSION: new AppParameter({
    type: 'ssm',
    id: 'kiss-kcc-vac-objecttype-version',
    description: 'KISS config: KISS config: VAC objecttype-version',
    path: `/${Statics.projectName}/kiss/vac/objecten/objecttype-version`,
    defaultValue: '1',
  }),
  VAC_OBJECTEN_TOKEN: new AppParameter({
    type: 'secret',
    id: 'kiss-kcc-vac-objecten-api-key',
    description: 'KISS config: API KEY for objecten API vac',
    path: `/${Statics.projectName}/kiss/vac/objecten-api-key`,
  }),
};