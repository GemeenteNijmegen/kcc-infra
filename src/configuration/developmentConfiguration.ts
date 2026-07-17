import { Criticality } from '@gemeentenijmegen/aws-constructs';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Configuration } from '../ConfigurationInterfaces';
import { AppParameter } from '../constructs/AppParameter';
import { Statics } from '../Statics';
import { ENTERPRISE_SEARCH_ENGINE, ENTERPRISE_SEARCH_PRIVATE_API_KEY } from './services/globalEnvironmentConfiguration';
import { ItaSharedEnvironmentConfiguration } from './services/ItaSharedEnvConfiguration';
import { KissSharedEnvironmentConfiguration } from './services/KissSharedEnvironmentConfiguration';


export const developmentConfiguration = {
  branch: 'development',
  buildEnvironment: Statics.gnBuildEnvironment,
  deploymentEnvironment: Statics.gnKccDev,
  criticality: new Criticality('low'),
  databaseSnapshotRetentionDays: 0,
  computeProvider: 'FARGATE',
  kissServices: [{
    id: 'kiss-1',
    subdomain: 'kiss',
    loadbalancerRulePriority: 30,
    taskSize: { cpu: '512', memory: '1024' },
    environment: {
      ...KissSharedEnvironmentConfiguration,
    },
  }],
  openObjectServices: [{
    id: 'objects-1',
    subdomain: 'objects',
    loadbalancerRulePriority: 40,
    taskSize: { cpu: '512', memory: '1024' },
    image: 'maykinmedia/open-object:4.1.0',
    redisIndexMain: 1,
    redisIndexCelery: 2,
    environment: {
      NOTIFICATIONS_DISABLED: 'True',
    },
  }],
  openKlantServices: [{
    id: 'open-klant-1',
    subdomain: 'open-klant',
    loadbalancerRulePriority: 45,
    taskSize: { cpu: '512', memory: '1024' },
    image: 'maykinmedia/open-klant:2.17.0',
    redisIndexMain: 3,
    redisIndexCelery: 4,
    environment: {},
  }],
  itaServices: [{
    id: 'ita-1',
    subdomain: 'taken',
    loadbalancerRulePriority: 50,
    taskSize: { cpu: '512', memory: '1024' },
    imageWebserver: 'ghcr.io/interne-taak-afhandeling/internetaakafhandeling.web:3.1',
    imagePoller: 'ghcr.io/interne-taak-afhandeling/internetaakafhandeling.poller:3.1',
    pollerSchedule: Schedule.rate(Duration.minutes(5)),
    environment: {
      ...ItaSharedEnvironmentConfiguration,
      ASPNETCORE_FORWARDEDHEADERS_ENABLED: 'true',
      // Objecttype versions
      LogBoekOptions__TypeVersion: '1',
      AfdelingOptions__TypeVersion: '1',
      GroepOptions__TypeVersion: '1',
    },
  }],
  elasticsearch: {
    instanceType: 't3.large',
    volumeSizeGb: 30,
    version: '8.17.0',
    amiId: 'ami-0f1834be8d049e69f',
  },
  elasticSync: {
    taskSize: { cpu: '256', memory: '512' },
    environment: {
      // Enterprise Search engine name (must match KISS config)
      ENTERPRISE_SEARCH_ENGINE: ENTERPRISE_SEARCH_ENGINE,
      ENTERPRISE_SEARCH_PRIVATE_API_KEY: ENTERPRISE_SEARCH_PRIVATE_API_KEY,

      // VAC source
      // Reuses same SSM paths as KISS service
      VAC_OBJECTEN_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'sync-vac-objecten-base-url',
        description: 'ElasticSync: Base URL for VAC objecten',
        path: `/${Statics.projectName}/kiss/vac/objecten/base-url`,
        defaultValue: 'https://objects.kcc-dev.csp-nijmegen.nl',
      }),
      VAC_OBJECT_TYPE_URL: new AppParameter({
        type: 'ssm',
        id: 'sync-vac-objecttype-url',
        description: 'ElasticSync: VAC objecttype URL',
        path: `/${Statics.projectName}/kiss/vac/objecten/objecttype-url`,
        defaultValue: 'https://objects.kcc-dev.csp-nijmegen.nl/api/v2/objecttypes/c8dda48e-6ab3-4e16-9631-815435f7f3fa',
      }),
      VAC_OBJECTEN_TOKEN: new AppParameter({
        type: 'secret',
        id: 'sync-vac-objecten-token',
        description: 'ElasticSync: API token for VAC objecten (shared with KISS)',
        path: `/${Statics.projectName}/kiss/vac/objecten-api-key`,
      }),

      // Medewerker/Smoelenboek source
      // Same Objects API, same token as groepen
      MEDEWERKER_OBJECTEN_BASE_URL: new AppParameter({
        type: 'ssm',
        id: 'sync-medewerker-objecten-base-url',
        description: 'ElasticSync: Base URL for medewerker objecten',
        path: `/${Statics.projectName}/kiss/medewerker/objecten/base-url`,
        defaultValue: 'https://objects.kcc-dev.csp-nijmegen.nl',
      }),
      MEDEWERKER_OBJECT_TYPE_URL: new AppParameter({
        type: 'ssm',
        id: 'sync-medewerker-objecttype-url',
        description: 'ElasticSync: Medewerker objecttype URL',
        path: `/${Statics.projectName}/kiss/medewerker/objecten/objecttype-url`,
        defaultValue: 'https://objects.kcc-dev.csp-nijmegen.nl/api/v2/objecttypes/797a7a50-049d-491b-bb0a-fce1ba95a35c',
      }),
      MEDEWERKER_OBJECTEN_TOKEN: new AppParameter({
        type: 'secret',
        id: 'sync-medewerker-objecten-token',
        description: 'ElasticSync: API token for medewerker objecten (same as groepen token)',
        path: `/${Statics.projectName}/kiss/groepen/objecten-api-key`,
      }),

      // SDG/Kennisbank source; same Objects API
      // Uncomment when SDG objecttype is created:
      // SDG_OBJECTEN_BASE_URL: new AppParameter({
      //   type: 'ssm',
      //   id: 'sync-sdg-objecten-base-url',
      //   description: 'ElasticSync: Base URL for SDG objecten (kennisbank)',
      //   path: `/${Statics.projectName}/kiss/sdg/objecten/base-url`,
      //   defaultValue: 'https://objects.kcc-dev.csp-nijmegen.nl',
      // }),
      // SDG_OBJECT_TYPE_URL: new AppParameter({
      //   type: 'ssm',
      //   id: 'sync-sdg-objecttype-url',
      //   description: 'ElasticSync: SDG objecttype URL (fill with objecttype UUID after creating it)',
      //   path: `/${Statics.projectName}/kiss/sdg/objecten/objecttype-url`,
      // }),
      // SDG_OBJECTEN_TOKEN: new AppParameter({
      //   type: 'secret',
      //   id: 'sync-sdg-objecten-token',
      //   description: 'ElasticSync: API token for SDG objecten (same as groepen token)',
      //   path: `/${Statics.projectName}/kiss/groepen/objecten-api-key`,
      // }),
    },
    sources: [
      {
        id: 'vac',
        args: ['vac'],
        schedule: 'rate(59 minutes)',
      },
      {
        id: 'smoelenboek',
        args: ['smoelenboek'],
        schedule: 'rate(59 minutes)',
      },
    ],
  },
  websiteCrawler: {
    taskSize: { cpu: '256', memory: '512' },
    environment: {
      OUTPUT_INDEX: ENTERPRISE_SEARCH_ENGINE, // Store in the ES index for VAC, Medewerkers etc.
      // Note: ELASTIC_ENDPOINT, ELASTIC_USERNAME, ELASTIC_PASSWORD are injected in the service construct.
    },
    sources: [
      {
        id: 'nijmegen-website',
        schedule: 'rate(59 minutes)',
        environment: {
          TARGET_URL: 'https://www.nijmegen.nl', // without www. gives a 301, which causes problems
        },
      },
    ],

  },
} as Configuration;
