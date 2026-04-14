import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { PrivateDnsNamespace } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { Statics } from '../Statics';
import { ServiceLoadBalancer } from './LoadBalancer';

export interface ContainerPlatformProps {
  /**
   * The VPC to place the redis instance in.
   */
  vpc: IVpc;
  /**
   * The hosted zone that this platform should use for DNS
   */
  hostedZone: IHostedZone;
  /**
   * Certificate (wildcard)
   */
  certificate: ICertificate;
}

/**
 * Passed to service constructs for binding
 */
export interface ContainerServiceProps {
  cluster: Cluster;
  namespace: PrivateDnsNamespace;
  loadbalancer: ServiceLoadBalancer;
  hostedZone: IHostedZone;
  wildcardCertificate: ICertificate; // resolved once by the platform
}

/**
 * Abstract interface for container-based services we want to deploy on the container platform
 */
export interface IContainerService {
  readonly id: string;
  bind(platform: ContainerServiceProps): void;
}

export class ContainerPlatform extends Construct {

  readonly cluster: Cluster;
  readonly namespace: PrivateDnsNamespace;
  readonly loadBalancer: ServiceLoadBalancer;
  readonly certificate: ICertificate;

  constructor(scope: Construct, id: string, private readonly props: ContainerPlatformProps) {
    super(scope, id);

    this.certificate = this.props.certificate;

    // In service discovery
    this.namespace = new PrivateDnsNamespace(this, 'cloudmap', {
      name: `${Statics.projectName}.local`,
      vpc: props.vpc,
      description: `${Statics.projectName} CloudMap`,
    });

    // ECS cluster
    this.cluster = new Cluster(this, 'cluster', {
      vpc: props.vpc,
    });

    // A application loadbalancer (in a private subnet)
    this.loadBalancer = new ServiceLoadBalancer(this, 'loadbalancer', {
      vpc: props.vpc,
      hostedzone: props.hostedZone,
    });

  }

  addService(service: IContainerService) {
    service.bind({
      cluster: this.cluster,
      namespace: this.namespace,
      loadbalancer: this.loadBalancer,
      hostedZone: this.props.hostedZone,
      wildcardCertificate: this.certificate,
    });
  }

}
