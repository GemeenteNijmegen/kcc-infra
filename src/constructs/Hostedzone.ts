import { HostedZone, IHostedZone, ZoneDelegationRecord } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Statics } from '../Statics';

export interface ProjectHostedzoneProps {
  /**
   * The specific subdomain to use for this project
   * @default - the account hosted zone is used, no subdomain is created.
   */
  subdomain?: string;
}

/**
 * Creates a hostedzone for the project
 */
export class ProjectHostezone extends Construct {

  public readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: ProjectHostedzoneProps) {
    super(scope, id);
    const accountHostedzone = this.importAccountHostedzone();

    if (props.subdomain) {
      this.hostedZone = this.createProjectHostedzone(accountHostedzone);
      return;
    }

    this.hostedZone = accountHostedzone;

  }

  private createProjectHostedzone(accountHostedzone: IHostedZone) {
    const hz = new HostedZone(this, 'project-hostedzone', {
      zoneName: `kcc.${accountHostedzone.zoneName}`,
      comment: `${Statics.projectName} CSP domain`,
    });
    new ZoneDelegationRecord(this, 'delegate', {
      zone: accountHostedzone,
      recordName: 'kcc',
      nameServers: hz.hostedZoneNameServers!,
    });
    return hz;
  }

  private importAccountHostedzone() {
    return HostedZone.fromHostedZoneAttributes(this, 'account-hostedzone', {
      hostedZoneId: StringParameter.valueForStringParameter(this, Statics.ssmAccountRootHostedZoneId),
      zoneName: StringParameter.valueForStringParameter(this, Statics.ssmAccountRootHostedZoneName),
    });
  }
}