export class Statics {
  static readonly projectName = 'kcc-infra';
  static readonly projectRepo = 'GemeenteNijmegen/kcc-infra';
  static readonly organization = 'GemeenteNijmegen';

  // MARK: SSM Parameters
  static readonly ssmWildcardCertificatePath = `/${Statics.projectName}/wildcard-certificate`;
  static readonly ssmWildcardCertificateArn = `/${Statics.projectName}/wildcard-certificate/arn`;

  // Managed in dns-managment project:
  // Below references the new hosted zone separeted from webformulieren
  static readonly ssmAccountRootHostedZonePath: string = '/gemeente-nijmegen/account/hostedzone';
  static readonly ssmAccountRootHostedZoneId: string = '/gemeente-nijmegen/account/hostedzone/id';
  static readonly ssmAccountRootHostedZoneName: string = '/gemeente-nijmegen/account/hostedzone/name';

  // Lets use _ for denoting internal like parameters (eg for stack decoupling)
  static readonly _ssmCertificateArn = `/${Statics.projectName}/internal/cloudfront/cert-arn`;
  static readonly _ssmDatabaseCredentials = `/${Statics.projectName}/internal/database/credentials`;
  static readonly _ssmOpenKlantCredentials = `/${Statics.projectName}/internal/open-klant/credentials`;
  static readonly _ssmCorsaZgwCredentials = `/${Statics.projectName}/internal/corsa-zgw/credentials`;
  static readonly _ssmOpenNotificatiesCredentials = `/${Statics.projectName}/internal/open-notificaties/credentials`;
  static readonly _ssmRabbitMqCredentials = `/${Statics.projectName}/internal/open-notificaties/rabbit-mq/credentials`;
  static readonly _ssmClientCredentialsZaakNotifications = `/${Statics.projectName}/internal/open-notificaties/client/credentials/zaak-notifications`;
  static readonly _ssmClientCredentialsNotificationsZaak = `/${Statics.projectName}/internal/open-notificaties/client/credentials/notifications-zaak`;
  static readonly _ssmOpenZaakCredentials = `/${Statics.projectName}/internal/open-zaak/credentials`;
  static readonly _ssmObjecttypesCredentials = `/${Statics.projectName}/internal/objecttypes/credentials`;
  static readonly _ssmObjectsCredentials = `/${Statics.projectName}/internal/objects/credentials`;
  static readonly _ssmOpenProductCredentials = `/${Statics.projectName}/internal/open-product/credentials`;
  static readonly _ssmDatabaseArn = `/${Statics.projectName}/internal/database/arn`;
  static readonly _ssmDatabaseHostname = `/${Statics.projectName}/internal/database/hostname`;
  static readonly _ssmDatabasePort = `/${Statics.projectName}/internal/database/post`;
  static readonly _ssmDatabaseSecurityGroup = `/${Statics.projectName}/internal/database/security-group`;
  static readonly _ssmFilesystemSecurityGroupId = `/${Statics.projectName}/internal/filesystem-security-group-id`;
  static readonly _ssmFilesystemArn = `/${Statics.projectName}/internal/filesystem-arn`;
  static readonly _ssmBackupVaultArn = `/${Statics.projectName}/internal/backup/vault-arn`;

  // MARK: Environments
  static readonly gnBuildEnvironment = {
    account: '836443378780',
    region: 'eu-central-1',
  };

  static readonly gnSandbox01 = {
    account: '833119272131',
    region: 'eu-central-1',
  };

  static databaseCredentialsName(dbName: string) {
    return `/${Statics.projectName}/internal/database/${dbName}/credentials`;
  }

}
