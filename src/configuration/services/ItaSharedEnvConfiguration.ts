import { AppParameter } from '../../constructs/AppParameter';
import { Statics } from '../../Statics';

export const ItaSharedEnvironmentConfiguration =
{

  // OIDC - webserver
  OIDC_AUTHORITY: new AppParameter({
    type: 'ssm',
    id: 'ita-oidc-authority',
    path: `/${Statics.projectName}/ita/oidc/authority`,
    description: 'ITA: OIDC authority',
  }),

  OIDC_CLIENT_ID: new AppParameter({
    type: 'ssm',
    id: 'ita-oidc-client-id',
    path: `/${Statics.projectName}/ita/oidc/client-id`,
    description: 'ITA: OIDC client id',
  }),

  OIDC_CLIENT_SECRET: new AppParameter({
    type: 'secret',
    id: 'ita-oidc-clientsecret',
    path: `/${Statics.projectName}/ita/oidc/clientsecret`,
    description: 'ITA: OIDC client secret',
  }),

  OIDC_ITA_SYSTEM_ACCESS_ROLE: new AppParameter({
    type: 'ssm',
    id: 'ita-oidc-system-access-role',
    path: `/${Statics.projectName}/ita/oidc/ita-system-access-role`,
    description: 'ITA: OIDC role required for normal ITA access',
    defaultValue: 'ITA-Gebruiker',
  }),

  OIDC_FUNCTIONEEL_BEHEERDER_ROLE: new AppParameter({
    type: 'ssm',
    id: 'ita-oidc-functioneel-beheerder-role',
    path: `/${Statics.projectName}/ita/oidc/functioneel-beheerder-role`,
    description: 'ITA: OIDC role required for functioneel beheer',
    defaultValue: 'ITA-Functioneel-Beheerder',
  }),

  OIDC_NAME_CLAIM_TYPE: 'name',
  OIDC_ROLE_CLAIM_TYPE: 'roles',
  OIDC_OBJECTREGISTER_MEDEWERKER_ID_CLAIM_TYPE: 'email',
  OIDC_EMAIL_CLAIM_TYPE: 'email',

  // Open Klant
  OpenKlantApi__BaseUrl: new AppParameter({
    type: 'ssm',
    id: 'ita-open-klant-base-url',
    path: `/${Statics.projectName}/ita/open-klant/base-url`,
    description: 'ITA: Open Klant klantinteracties API base URL',
  }),

  OpenKlantApi__ApiKey: new AppParameter({
    type: 'secret',
    id: 'ita-open-klant-api-key',
    path: `/${Statics.projectName}/ita/open-klant/api-key`,
    description: 'ITA: Open Klant API key',
  }),

  // Objecten API
  ObjectApi__BaseUrl: new AppParameter({
    type: 'ssm',
    id: 'ita-object-api-base-url',
    path: `/${Statics.projectName}/ita/objecten/base-url`,
    description: 'ITA: Objecten API base URL',
  }),

  ObjectApi__ApiKey: new AppParameter({
    type: 'secret',
    id: 'ita-object-api-key',
    path: `/${Statics.projectName}/ita/objecten/api-key`,
    description: 'ITA: Objecten API key',
  }),

  // Zaaksysteem / PodiumD adapter
  ZaakSysteem__BaseUrl: new AppParameter({
    type: 'ssm',
    id: 'ita-zaaksysteem-base-url',
    path: `/${Statics.projectName}/ita/zaaksysteem/base-url`,
    description: 'ITA: Zaaksysteem / PodiumD adapter base URL',
  }),

  ZaakSysteem__ClientId: new AppParameter({
    type: 'ssm',
    id: 'ita-zaaksysteem-client-id',
    path: `/${Statics.projectName}/ita/zaaksysteem/client-id`,
    description: 'ITA: Zaaksysteem / PodiumD adapter client id',
  }),

  ZaakSysteem__Key: new AppParameter({
    type: 'secret',
    id: 'ita-zaaksysteem-key',
    path: `/${Statics.projectName}/ita/zaaksysteem/key`,
    description: 'ITA: Zaaksysteem / PodiumD adapter key',
  }),

  // SMTP / notificaties
  Email__SmtpSettings__Host: new AppParameter({
    type: 'ssm',
    id: 'ita-smtp-host',
    path: `/${Statics.projectName}/ita/smtp/host`,
    description: 'ITA: SMTP host',
  }),

  Email__SmtpSettings__Port: new AppParameter({
    type: 'ssm',
    id: 'ita-smtp-port',
    path: `/${Statics.projectName}/ita/smtp/port`,
    description: 'ITA: SMTP port',
    defaultValue: '587',
  }),

  Email__SmtpSettings__Username: new AppParameter({
    type: 'ssm',
    id: 'ita-smtp-username',
    path: `/${Statics.projectName}/ita/smtp/username`,
    description: 'ITA: SMTP username',
  }),

  Email__SmtpSettings__Password: new AppParameter({
    type: 'secret',
    id: 'ita-smtp-password',
    path: `/${Statics.projectName}/ita/smtp/password`,
    description: 'ITA: SMTP password',
  }),

  Email__SmtpSettings__FromEmail: new AppParameter({
    type: 'ssm',
    id: 'ita-smtp-from-email',
    path: `/${Statics.projectName}/ita/smtp/from-email`,
    description: 'ITA: SMTP from email address',
  }),

  Email__SmtpSettings__EnableSsl: new AppParameter({
    type: 'ssm',
    id: 'ita-smtp-enable-ssl',
    path: `/${Statics.projectName}/ita/smtp/enable-ssl`,
    description: 'ITA: SMTP enable SSL',
    defaultValue: 'true',
  }),

  // Publieke ITA URL voor deeplinks in notificatiemails
  Ita__BaseUrl: new AppParameter({
    type: 'ssm',
    id: 'ita-base-url',
    path: `/${Statics.projectName}/ita/base-url`,
    description: 'ITA: public base URL used in email deeplinks',
  }),

  // Poller
  pollerMessage: 'Poller uitgevoerd om:',
  InternetakenNotifier__HourThreshold: '-24',

  // Objecttypen
  LogBoekOptions__Type: new AppParameter({
    type: 'ssm',
    id: 'ita-logboek-objecttype-url',
    path: `/${Statics.projectName}/ita/objecttypen/logboek/type-url`,
    description: 'ITA: Logboek objecttype URL',
  }),


  AfdelingOptions__Type: new AppParameter({
    type: 'ssm',
    id: 'ita-afdeling-objecttype-url',
    path: `/${Statics.projectName}/ita/objecttypen/afdeling/type-url`,
    description: 'ITA: Afdeling objecttype URL',
  }),


  GroepOptions__Type: new AppParameter({
    type: 'ssm',
    id: 'ita-groep-objecttype-url',
    path: `/${Statics.projectName}/ita/objecttypen/groep/type-url`,
    description: 'ITA: Groep objecttype URL',
  }),


  // Styling in Gemeente Nijmegen theme (no NLDS used as this is currently not sufficient)
  RESOURCES__THEME_NAAM: 'nijmegen-theme',
  RESOURCES__LOGO_URL: new AppParameter({
    type: 'ssm',
    id: 'ita-logo-url',
    path: `/${Statics.projectName}/ita/styling/logo-url`,
    description: 'ITA: logo URL',
    defaultValue: 'https://componenten.nijmegen.nl/v6.5.0/img/beeldmerklabel.svg',
  }),
  RESOURCES__FAVICON_URL: new AppParameter({
    type: 'ssm',
    id: 'ita-favicon-url',
    path: `/${Statics.projectName}/ita/styling/favicon-url`,
    description: 'ITA: favicon URL',
    defaultValue: 'https://componenten.nijmegen.nl/v6.5.0/_subtheme/img/favicon.ico',
  }),
  RESOURCES__DESIGN_TOKENS_URL: new AppParameter({ // Used to inject custom css
    type: 'ssm',
    id: 'ita-design-tokens-url',
    path: `/${Statics.projectName}/ita/styling/design-tokens-url`,
    description: 'ITA: NL Design System design tokens CSS URL',
    defaultValue: 'https://taken.kcc-dev.csp-nijmegen.nl/css/ita-theme.css',
  }),
  // RESOURCES__WEB_FONT_SOURCES: new AppParameter({
  //   type: 'ssm',
  //   id: 'ita-web-font-sources',
  //   path: `/${Statics.projectName}/ita/styling/web-font-sources`,
  //   description: 'ITA: space-separated web font source URLs',
  //   defaultValue: '',
  // }),

  // Optional diagnostics / later
  // AllowedHosts: '*',
  Logging__LogLevel__Default: 'Information',
  Logging__LogLevel__Microsoft_AspNetCore: 'Warning',
  // Serilog__MinimumLevel: 'Information',

};