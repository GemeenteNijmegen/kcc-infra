import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { InstanceClass, InstanceSize, InstanceType, IVpc, LaunchTemplate, Peer, Port, SecurityGroup, UserData } from 'aws-cdk-lib/aws-ec2';
import { AsgCapacityProvider, Cluster, EcsOptimizedImage } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { PrivateDnsNamespace } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { ComputeProvider } from '../ConfigurationInterfaces';
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
  /**
   * The compute capacity provider
   * @default 'FARGATE'
   */
  computeProvider?: ComputeProvider;
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
  computeProvider: ComputeProvider;
}

/**
 * Abstract interface for container-based services we want to deploy on the container platform
 */
export interface IContainerService {
  readonly id: string;
  /**
   * This function is called by the platform on addService. It provides all
   * tools to deploy a service on the container platform.
   * @param platform 
   */
  bind(platform: ContainerServiceProps): void;
}

export class ContainerPlatform extends Construct {

  readonly cluster: Cluster;
  readonly namespace: PrivateDnsNamespace;
  readonly loadBalancer: ServiceLoadBalancer;
  readonly certificate: ICertificate;
  readonly computeProvider: ComputeProvider;

  constructor(scope: Construct, id: string, private readonly props: ContainerPlatformProps) {
    super(scope, id);

    this.certificate = this.props.certificate;
    this.computeProvider = this.props.computeProvider ?? 'FARGATE';

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

    // Add EC2 capacity when using EC2 compute provider otherwise default to fargate
    if (this.computeProvider === 'EC2') {
      this.setupEc2CapacityProvider(props.vpc);
    }

  }

  addService(service: IContainerService) {
    service.bind({
      cluster: this.cluster,
      namespace: this.namespace,
      loadbalancer: this.loadBalancer,
      hostedZone: this.props.hostedZone,
      wildcardCertificate: this.certificate,
      computeProvider: this.computeProvider,
    });
  }

  private setupEc2CapacityProvider(vpc: IVpc) {
    const role = new Role(this, 'ec2-instance-role', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2ContainerServiceforEC2Role'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    const securityGroup = new SecurityGroup(this, 'ec2-instance-sg', {
      vpc,
      description: 'Security group for ECS EC2 instances',
    });
    securityGroup.addIngressRule(
      this.loadBalancer.alb.connections.securityGroups[0],
      Port.tcpRange(32768, 65535),
      'Allow ALB to reach ECS dynamic port range',
    );

    const userData = UserData.forLinux();
    userData.addCommands(
      `echo ECS_CLUSTER=${this.cluster.clusterName} >> /etc/ecs/ecs.config`,
    );

    const launchTemplate = new LaunchTemplate(this, 'launch-template', {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
      machineImage: EcsOptimizedImage.amazonLinux2023(),
      requireImdsv2: true,
      securityGroup,
      userData,
      role,
    });

    const asg = new AutoScalingGroup(this, 'asg', {
      vpc: vpc,
      launchTemplate,
      minCapacity: 1,
      maxCapacity: 3,
    });

    const capacityProvider = new AsgCapacityProvider(this, 'asg-capacity-provider', {
      autoScalingGroup: asg,
    });
    this.cluster.addAsgCapacityProvider(capacityProvider);
  }

}
