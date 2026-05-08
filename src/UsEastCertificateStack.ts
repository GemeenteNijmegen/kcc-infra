import { RemoteParameters } from '@gemeentenijmegen/cross-region-parameters';
import { Duration, aws_ssm as SSM, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { Statics } from './Statics';

export interface UsEastCertificateStackProps extends StackProps {
  mainRegion: string;
  /**
   * Alternatieve domeinnamen voor het certificaat, bijvoorbeeld nijmegen.nl.
   * Gebruik dit wanneer de applicatie ook bereikbaar moet zijn via een extern domein
   * buiten de eigen csp-nijmegen.nl hostedzone. Let op: validatie van externe domeinen
   * gaat niet automatisch en vereist handmatige DNS-aanpassingen.
   */
  alternativeDomainNames?: string[];
}

export class UsEastCertificateStack extends Stack {

  constructor(scope: Construct, id: string, props: UsEastCertificateStackProps) {
    super(scope, id, props);
    const hostedZone = this.importProjectHostedZone(this, props.mainRegion);
    this.createCertificate(hostedZone, props.alternativeDomainNames);
  }

  private importProjectHostedZone(scope: Construct, fromRegion: string) {
    const zoneParams = new RemoteParameters(scope, 'zone-params', {
      path: Statics.ssmAccountRootHostedZonePath,
      region: fromRegion,
      timeout: Duration.seconds(10),
    });
    return HostedZone.fromHostedZoneAttributes(scope, 'zone', {
      hostedZoneId: zoneParams.get(Statics.ssmAccountRootHostedZoneId),
      zoneName: zoneParams.get(Statics.ssmAccountRootHostedZoneName),
    });
  }

  private createCertificate(hostedZone: IHostedZone, alternativeDomainNames?: string[]) {

    // ------------------------------------------------------------------------------------
    // Niet-wildcard certificaat (nu niet in gebruik)
    //
    // Dit certificaat is nodig wanneer de applicatie ook bereikbaar wordt via een extern
    // domein zoals nijmegen.nl, naast het csp-nijmegen.nl subdomein. In dat geval moet
    // het certificaat beide domeinen dekken via subjectAlternativeNames.
    // ------------------------------------------------------------------------------------
    const cnames = [];//[`cf.${hostedZone.zoneName}`];
    if (alternativeDomainNames) {
      cnames.push(...alternativeDomainNames);
    }
    // const cert = new Certificate(this, 'certificate', {
    //   domainName: hostedZone.zoneName,
    //   subjectAlternativeNames: cnames,
    //   // fromDns() zonder hostedzone: validatie werkt voor meerdere zones tegelijk,
    //   // maar externe domeinen (nijmegen.nl) vereisen handmatige DNS-aanpassing.
    //   validation: alternativeDomainNames
    //     ? CertificateValidation.fromDns()
    //     : CertificateValidation.fromDns(hostedZone),
    // });
    // new SSM.StringParameter(this, 'cert-arn', {
    //   stringValue: cert.certificateArn,
    //   parameterName: Statics._ssmCertificateArn, // Wijzigin Statics.ts zonder unerscore
    // });

    // ------------------------------------------------------------------------------------
    // Wildcard certificaat (actief)
    //
    // Dekt alle subdomeinen van de eigen csp-nijmegen.nl hostedzone, bijvoorbeeld:
    // kiss.kcc-dev.csp-nijmegen.nl, ita.kcc-dev.csp-nijmegen.nl, etc.
    //
    // De hostedzone wordt expliciet meegegeven aan fromDns(), zodat ACM de
    // validatie-records automatisch kan aanmaken in Route53. Zonder hostedzone zou
    // het certificaat blijven hangen op 'Pending validation'.
    //
    // Wanneer er ook externe domeinen (nijmegen.nl) gedekt moeten worden:
    // 1. Activeer het niet-wildcard certificaat hierboven
    // 2. Vervang fromDns(hostedZone) door fromDns() zonder argument
    // 3. Voeg alternativeDomainNames toe aan subjectAlternativeNames
    // 4. Valideer de externe domeinen handmatig in de Nijmegen DNS
    // ------------------------------------------------------------------------------------
    const wildcardCert = new Certificate(this, 'wildcard-certificate', {
      domainName: `*.${hostedZone.zoneName}`,
      subjectAlternativeNames: [
        hostedZone.zoneName,
        ...cnames,
      ],
      validation: CertificateValidation.fromDns(),
    });

    new SSM.StringParameter(this, 'wildcard-cert-arn', {
      stringValue: wildcardCert.certificateArn,
      parameterName: Statics.ssmWildcardCertificateArn,
    });
  }
}