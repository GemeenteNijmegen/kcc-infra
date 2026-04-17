import { GemeenteNijmegenVpc } from '@gemeentenijmegen/aws-constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { CertificateValidation, DnsValidatedCertificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { Configurable, Configuration } from './ConfigurationInterfaces';
import { ContainerPlatform } from './constructs/ContainerPlatform';
import { DnsRecords } from './constructs/DnsRecords';
import { ProjectHostezone } from './constructs/Hostedzone';
import { ElasticsearchService } from './services/ElasticsearchService';
import { EnterpriseSearchService } from './services/EnterpriseSearchService';
import { HelloWorldService } from './services/HelloWorld';
import { ItaService } from './services/ItaService';
import { KibanaService } from './services/KibanaService';
import { KissService } from './services/KissService';
import { OidcMockService } from './services/OidcMockService';
import { Statics } from './Statics';


interface MainStackProps extends StackProps, Configurable { }

/**
 * Main stack of this project
 * Constains resources such as loadbalancer, cloudfront, apigateway, fargate cluster
 */
export class MainStack extends Stack {

  private readonly vpc: GemeenteNijmegenVpc;
  private readonly hostedzone: ProjectHostezone;
  private readonly certificate: ICertificate;
  private readonly containerPlatform: ContainerPlatform;
  private readonly configuration: Configuration;

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    this.configuration = props.configuration;

    // Do imports before setting up the platform.
    this.hostedzone = new ProjectHostezone(this, 'hostedzone', {
      subdomain: 'kcc',
    });
    this.vpc = new GemeenteNijmegenVpc(this, 'vpc');

    // Depricated but still the only way without deploying a custom stack.
    this.certificate = new DnsValidatedCertificate(this, 'cert', {
      region: 'us-east-1',
      domainName: `*.${this.hostedzone.hostedZone.zoneName}`,
      validation: CertificateValidation.fromDns(this.hostedzone.hostedZone),
      hostedZone: this.hostedzone.hostedZone,
    });

    // Add CNAME records for certificates
    new DnsRecords(this, 'dns', {
      hostedzone: this.hostedzone.hostedZone,
      cnameRecords: this.configuration.cnameRecords,
    });

    const dbSecurityGroupId = StringParameter.valueForStringParameter(this, Statics._ssmDatabaseSecurityGroup);
    const dbSecurityGroup = SecurityGroup.fromSecurityGroupId(this, 'db-security-group', dbSecurityGroupId);

    // Create the container platform
    this.containerPlatform = new ContainerPlatform(this, 'containers', {
      vpc: this.vpc.vpc,
      hostedZone: this.hostedzone.hostedZone,
      certificate: this.certificate,
      computeProvider: this.configuration.computeProvider,
      ec2InstanceAllowedSecurityGroups: [
        { sg: dbSecurityGroup, port: 5432 },
      ],
    });

    this.helloWorldService();
    this.oidcMockService();
    this.kissFrontendService();
    this.itaService();
    this.elasticsearchService();
    this.enterpriseSearchService();
    this.kibanaService();
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

  private oidcMockService() {
    if (!this.configuration.oidcMockServices) {
      return;
    }
    for (const oidcMockService of this.configuration.oidcMockServices) {
      const service = new OidcMockService(this, oidcMockService.id, {
        serviceConfiguration: oidcMockService,
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

  private elasticsearchService() {
    if (!this.configuration.elasticsearchServices) {
      return;
    }
    for (const config of this.configuration.elasticsearchServices) {
      const service = new ElasticsearchService(this, config.id, {
        serviceConfiguration: config,
      });
      this.containerPlatform.addService(service);
    }
  }

  private enterpriseSearchService() {
    if (!this.configuration.enterpriseSearchServices) {
      return;
    }
    for (const config of this.configuration.enterpriseSearchServices) {
      const service = new EnterpriseSearchService(this, config.id, {
        serviceConfiguration: config,
      });
      this.containerPlatform.addService(service);
    }
  }

  private kibanaService() {
    if (!this.configuration.kibanaServices) {
      return;
    }
    for (const config of this.configuration.kibanaServices) {
      const service = new KibanaService(this, config.id, {
        serviceConfiguration: config,
      });
      this.containerPlatform.addService(service);
    }
  }

}


