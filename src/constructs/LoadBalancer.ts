import { StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { ApplicationListener, ApplicationLoadBalancer, ApplicationProtocol, IListenerCertificate, ListenerAction } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface LoadBalancerProps extends StackProps {
  vpc: IVpc;
  hostedzone: IHostedZone;
}

export class ServiceLoadBalancer extends Construct {

  public alb: ApplicationLoadBalancer;
  private listener: ApplicationListener;

  constructor(scope: Construct, id: string, private readonly props: LoadBalancerProps) {
    super(scope, id);

    const certificate = new Certificate(this, 'cert', {
      domainName: `alb.${props.hostedzone.zoneName}`,
      validation: CertificateValidation.fromDns(props.hostedzone), // Note: we use the public hosted zone here
    });

    // Create the actual loadbalancer
    this.alb = new ApplicationLoadBalancer(this, 'alb', {
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // Add A record for resolving the ALB.
    // Note: this happens using the public hosted zone, the ALB however is still private.
    new ARecord(this, 'a-record', {
      recordName: 'alb',
      target: RecordTarget.fromAlias(new LoadBalancerTarget(this.alb)),
      zone: props.hostedzone,
    });

    // Setup the https listener
    this.listener = this.createListener(certificate);

    // Ad a http listener that redirects to https
    this.forwardHttpToHttps();

    this.addAccessLogging();
  }

  private addAccessLogging() {
    const bucket = new Bucket(this, 'access-logs');
    this.alb.logAccessLogs(bucket);
  }


  private createListener(certificate: IListenerCertificate) {
    const httpListener = this.alb.addListener('listener', {
      port: 443,
      certificates: [certificate],
      open: false,
      defaultAction: ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Niet gevonden',
      }),
    });

    return httpListener;
  }

  private forwardHttpToHttps() {
    const httpListener = this.alb.addListener('http-listener', {
      protocol: ApplicationProtocol.HTTP,
      open: false,
      defaultAction: ListenerAction.redirect({
        permanent: true,
        protocol: 'HTTPS',
      }),
    });
    return httpListener;
  }


  getListener() {
    return this.listener;
  }

}
