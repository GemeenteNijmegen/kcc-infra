import { GemeenteNijmegenVpc } from '@gemeentenijmegen/aws-constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Configurable, Configuration } from './ConfigurationInterfaces';
import { ContainerPlatform } from './constructs/ContainerPlatform';
import { DnsRecords } from './constructs/DnsRecords';
import { ProjectHostezone } from './constructs/Hostedzone';
import { HelloWorldService } from './services/HelloWorld';


interface MainStackProps extends StackProps, Configurable { }

/**
 * Main stack of this project
 * Constains resources such as loadbalancer, cloudfront, apigateway, fargate cluster
 */
export class MainStack extends Stack {

  private readonly vpc: GemeenteNijmegenVpc;
  private readonly hostedzone: ProjectHostezone;
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

    // Add CNAME records for certificates
    new DnsRecords(this, 'dns', {
      hostedzone: this.hostedzone.hostedZone,
      cnameRecords: this.configuration.cnameRecords,
    });

    // Create the container platform
    this.containerPlatform = new ContainerPlatform(this, 'containers', {
      vpc: this.vpc.vpc,
      hostedZone: this.hostedzone.hostedZone,
    });

    this.helloWorldService();
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


}


