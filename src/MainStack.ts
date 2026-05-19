import { GemeenteNijmegenVpc } from '@gemeentenijmegen/aws-constructs';
import { RemoteParameters } from '@gemeentenijmegen/cross-region-parameters';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable, Configuration } from './ConfigurationInterfaces';
import { ContainerPlatform } from './constructs/ContainerPlatform';
import { DnsRecords } from './constructs/DnsRecords';
import { HelloWorldService } from './services/HelloWorld';
import { ItaService } from './services/ItaService';
import { KissService } from './services/KissService';
import { OpenObjectService } from './services/OpenObjectService';
import { Statics } from './Statics';


interface MainStackProps extends StackProps, Configurable { }

/**
 * Main stack of this project
 * Constains resources such as loadbalancer, cloudfront, apigateway, fargate cluster
 */
export class MainStack extends Stack {

  private readonly vpc: GemeenteNijmegenVpc;
  private readonly hostedzone: IHostedZone;
  private readonly certificate: ICertificate;
  private readonly containerPlatform: ContainerPlatform;
  private readonly configuration: Configuration;

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    this.configuration = props.configuration;

    // Do imports before setting up the platform.
    this.hostedzone = this.importHostedzone();
    this.certificate = this.importCertificate();
    this.vpc = new GemeenteNijmegenVpc(this, 'vpc');


    // Add CNAME records for certificates
    new DnsRecords(this, 'dns', {
      hostedzone: this.hostedzone,
      cnameRecords: this.configuration.cnameRecords,
    });

    const dbSecurityGroupId = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseSecurityGroup);
    const dbSecurityGroup = SecurityGroup.fromSecurityGroupId(this, 'db-security-group', dbSecurityGroupId);

    // Create the container platform
    this.containerPlatform = new ContainerPlatform(this, 'containers', {
      vpc: this.vpc.vpc,
      hostedZone: this.hostedzone,
      certificate: this.certificate,
      computeProvider: this.configuration.computeProvider,
      ec2InstanceAllowedSecurityGroups: [
        { sg: dbSecurityGroup, port: 5432 },
      ],
    });

    this.helloWorldService();
    this.kissFrontendService();
    this.itaService();
    this.openObjectService();

  }


  private importHostedzone() {
    return HostedZone.fromHostedZoneAttributes(this, 'hostedzone', {
      hostedZoneId: StringParameter.valueForStringParameter(
        this,
        Statics.ssmAccountRootHostedZoneId,
      ),
      zoneName: StringParameter.valueForStringParameter(
        this,
        Statics.ssmAccountRootHostedZoneName,
      ),
    });
  }


  private importCertificate(): ICertificate {
    const parameters = new RemoteParameters(this, 'params', {
      path: `${Statics.ssmWildcardCertificatePath}/`,
      region: 'us-east-1',
      timeout: Duration.seconds(10),
    });
    const certificateArn = parameters.get(Statics.ssmWildcardCertificateArn);
    return Certificate.fromCertificateArn(this, 'certificate', certificateArn);
  }

  /**
   * For each hello world service configuration deploy a service.
   * @param platform
   * @returns
   */
  private helloWorldService() {
    if (!this.configuration.helloWorlServices) {
      return;
    }
    for (const helloWorldServiceConfig of this.configuration.helloWorlServices) {
      const service = new HelloWorldService(this, helloWorldServiceConfig.id, {
        serviceConfiguration: helloWorldServiceConfig,
      });
      this.containerPlatform.addService(service);
    }
  }

  private kissFrontendService() {
    if (!this.configuration.kissServices) {
      return;
    }
    for (const kissService of this.configuration.kissServices) {
      const service = new KissService(this, kissService.id, {
        serviceConfiguration: kissService,
      });
      this.containerPlatform.addService(service);
    }
  }

  private itaService() {
    if (!this.configuration.itaServices) {
      return;
    }
    for (const itaServiceConfig of this.configuration.itaServices) {
      const service = new ItaService(this, itaServiceConfig.id, {
        serviceConfiguration: itaServiceConfig,
      });
      this.containerPlatform.addService(service);
    }
  }

  private openObjectService() {
    if (!this.configuration.openObjectServices) {
      return;
    }
    for (const openObjectServiceConfig of this.configuration.openObjectServices) {
      const service = new OpenObjectService(this, openObjectServiceConfig.id, {
        serviceConfiguration: openObjectServiceConfig,
      });
      this.containerPlatform.addService(service);
    }
  }

}


