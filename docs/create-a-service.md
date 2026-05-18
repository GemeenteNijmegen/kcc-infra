# How to Add a New Service to kcc-infra

This document explains how services are defined and deployed in the kcc-infra project. It is aimed at developers who want to add a new container-based service to the platform.

## Overview

This project is an **[AWS CDK](https://aws.amazon.com/cdk/)** application managed with **[Projen](https://projen.io/)**. Services are deployed as **Fargate ECS tasks** behind a shared **Application Load Balancer (ALB) + CloudFront** stack. The architecture follows a **Platform → Service Binding** pattern:

```
┌─────────────────────────────────────────────────────┐
│                   MainStack                         │
│                                                     │
│  VPC ──── HostedZone ──── ContainerPlatform          │
│                        │                              │
│                        ├─── HelloWorldService.bind()  │
│                        ├─── YourService.bind()        │
│                        └─── OtherService.bind()       │
│                        │                              │
│  ContainerPlatform:                                       │
│    - ECS cluster                                           │
│    - CloudMap namespace (service discovery)                │
│    - ALB + HTTPS listener + DNS cert                       │
│    - Wildcard cert (imported from us-east-1 Parameter Store│
└─────────────────────────────────────────────────────┘
```

Each service is a CDK `Construct` that implements the `IContainerService` interface. During construction, the `ContainerPlatform` calls each service's `bind()` method, passing shared platform resources. The service then provisions its own ECS task definition, registers targets on the shared ALB, and sets up CloudFront + Route53 DNS records for its subdomain.

---

## Step 1: Define Configuration Interfaces

Services are toggled and configured per-environment via **TypeScript interfaces**. This keeps all environment-specific values (subdomains, task sizes, etc.) in one place.

### 1a. Create a service configuration interface

Add your service's configuration interface to **`src/ConfigurationInterfaces.ts`**:

```typescript
/**
 * Configuration for the my-api service
 */
export interface MyApiServiceConfiguration extends MainTaskSizeConfiguration, ServiceConfiguration {
  /**
   * Optional: add service-specific config fields here
   * e.g. environment variables, feature flags, image overrides, etc.
   */
}
```

The two base interfaces every service configuration should extend are:

| Interface | Purpose |
|---|---|
| `ServiceConfiguration` | Requires `id`, `subdomain`, and `priority` for the ALB target rule. |
| `MainTaskSizeConfiguration` | Optional task size (`cpu` / `memory`) for Fargate. Defaults to 256 CPU / 512 MiB. |

### 1b. Add the services array to the top-level `Configuration` interface

In the same file, add an optional property for your services:

```typescript
export interface Configuration {
  // ... existing fields ...

  /**
   * Provide configuration for a number of my-api services
   * @default - no my-api services are deployed
   */
  myApiServices?: MyApiServiceConfiguration[];
}
```

### 1c. Add environment config in `src/Configuration.ts`

Wire up the configuration per environment in the `EnvironmentConfigurations` map:

```typescript
const EnvironmentConfigurations: { [key: string]: Configuration } = {
  sandbox: {
    // ... existing fields ...
    myApiServices: [
      {
        subdomain: 'my-api',
        id: 'my-api-service-1',
        priority: 10,
        taskSize: { cpu: '512', memory: '1024' },
      },
    ],
  },
  // ... other environments ...
};
```

---

## Step 2: Create the Service Construct

Create a new file in **`src/services/`** (e.g. `MyApi.ts`). The service construct must implement `IContainerService`. See the full example below:

```typescript
import { AwsLogDriver, Compatibility, ContainerImage, FargateService, Protocol, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import { ListenerCondition } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DnsRecordType } from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';

import { MyApiServiceConfiguration } from '../ConfigurationInterfaces';
import { ContainerServiceProps, IContainerService } from '../constructs/ContainerPlatform';
import { ContainerServiceUtils } from '../constructs/ContainerUtils';
import { SubdomainCloudfront } from '../constructs/SubdomainCloudfront';

export interface MyApiServiceProps {
  readonly serviceConfiguration: MyApiServiceConfiguration;
}

export class MyApiService extends Construct implements IContainerService {

  static readonly IMAGE = 'myorg/my-api';
  static readonly CONTAINER_PORT = 8080;
  static readonly HOST_PORT = 8080;

  readonly id: string;

  constructor(scope: Construct, id: string, private props: MyApiServiceProps) {
    super(scope, id);
    this.id = props.serviceConfiguration.id;
  }

  bind(platform: ContainerServiceProps): void {
    const subdomain = this.props.serviceConfiguration.subdomain;
    const priority = this.props.serviceConfiguration.priority;

    // 1. Provision a CloudWatch log group
    const logs = this.logGroup();

    // 2. Create the ECS Fargate service
    const service = this.setupService(logs, platform);

    // 3. Create CloudFront distribution + DNS records for the subdomain
    new SubdomainCloudfront(this, 'subdomain-cloudfront', {
      certificate: platform.wildcardCertificate,
      hostedZone: platform.hostedZone,
      loadbalancer: platform.loadbalancer.alb,
      subdomain: subdomain,
    });

    // 4. Register this service on the shared ALB
    platform.loadbalancer
      .getListerner()
      .addTargets(`${this.id}-targets`, {
        targets: [service],
        conditions: [ListenerCondition.hostHeaders([subdomain])],
        healthCheck: {
          enabled: true,
          path: '/health',
        },
        priority: priority,
      });
  }

  private setupService(logs: LogGroup, platform: ContainerServiceProps) {
    const task = new TaskDefinition(this, 'main-task', {
      cpu: this.props.serviceConfiguration.taskSize?.cpu ?? '256',
      memoryMiB: this.props.serviceConfiguration.taskSize?.memory ?? '512',
      compatibility: Compatibility.FARGATE,
    });

    task.addContainer('main', {
      image: ContainerImage.fromRegistry(MyApiService.IMAGE),
      logging: new AwsLogDriver({
        streamPrefix: 'logs',
        logGroup: logs,
      }),
      portMappings: [
        {
          containerPort: MyApiService.CONTAINER_PORT,
          hostPort: MyApiService.HOST_PORT,
          protocol: Protocol.TCP,
        },
      ],
      environment: {
        // Add environment variables here
        NODE_ENV: 'production',
      },
      secrets: {
        // Add secrets from Secrets Manager or SSM here
        // DB_PASSWORD: SecretValue.secretsManager('...'),
      },
    });

    const service = new FargateService(this, 'service', {
      cluster: platform.cluster,
      taskDefinition: task,
      cloudMapOptions: {
        cloudMapNamespace: platform.namespace,
        containerPort: MyApiService.HOST_PORT,
        dnsRecordType: DnsRecordType.SRV,
        dnsTtl: Duration.seconds(60),
      },
      desiredCount: 1,
      enableExecuteCommand: true,
    });

    ContainerServiceUtils.allowExecutingCommands(task);

    return service;
  }

  private logGroup() {
    return new LogGroup(this, 'logs', {
      retention: RetentionDays.ONE_MONTH,
    });
  }
}
```

### Key parts of the service construct

| Step | Purpose |
|---|---|
| **`bind(platform)`** | Called by `ContainerPlatform.addService()`. Receives shared platform resources (cluster, namespace, load balancer, certs, hosted zone). This is where all your resources are provisioned. |
| **Log group** | Each service gets its own CloudWatch log group. Adjust retention as needed. |
| **Task definition** | Define CPU, memory, container image, port mappings, environment variables, and secrets. |
| **Fargate service** | Runs the task on the shared cluster. Registers with CloudMap via the platform's namespace for service discovery. Set `enableExecuteCommand: true` for `ecs execute-command` debugging. |
| **`ContainerServiceUtils.allowExecutingCommands(task)`** | Grants the IAM permissions needed for ECS exec. Always include this. |
| **`SubdomainCloudfront`** | Creates a CloudFront distribution with the wildcard certificate, DNS A/AAAA records, and load balancer access rules for your service's subdomain. |
| **ALB target registration** | Routes traffic to your service based on the `Host` header. The priority value ensures rule ordering on the ALB. |

---

## Step 3: Register the Service in `MainStack`

In **`src/MainStack.ts`**, import your service and instantiate it in a method that iterates over the configuration:

```typescript
import { MyApiService } from './services/MyApi';

export class MainStack extends Stack {
  // ... existing code ...

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);
    // ... existing initialisation ...

    this.myApiService();
  }

  private myApiService() {
    if (!this.configuration.myApiServices) {
      return;
    }
    for (const config of this.configuration.myApiServices) {
      this.containerPlatform.addService(
        new MyApiService(this, config.id, {
          serviceConfiguration: config,
        }),
      );
    }
  }
}
```

The pattern is consistent across all services:

1. Early-return if the configuration is not present for this environment.
2. Instantiate one `MyApiService` per configuration object.
3. Register it via `this.containerPlatform.addService()` — this triggers `bind()`.

---

## Step 4: Build & Deploy

```bash
# Install dependencies
npm ci

# Build (compiles TypeScript)
npm run build

# Synthesize CloudFormation
npx cdk synth

# Deploy the pipeline stack (which includes all stages)
npx cdk deploy --parameters connectionArn=<your-codestar-connection-arn>
```

The pipeline will then:
1. **ParameterStage** — write shared parameters (DB credentials, etc.) to SSM in the deployment environment.
2. **KccInfraStage** — deploy the `MainStack` (with your new service), `DatabaseStack`, and `UsEastCertificateStack`.

> **Note:** On first deploy you must supply the `connectionArn` parameter (your CodeStar connection ARN from [AWS CodePipeline Settings](https://eu-central-1.console.aws.amazon.com/codesuite/settings/connections?region=eu-central-1)). Subsequent deploys trigger automatically on commits to the configured branch.

---

## Architecture Summary

### Stacks (deployment units)

| Stack | Purpose |
|---|---|
| `PipelineStack` | CodePipeline that synthesises and deploys the app. Runs in the build account. |
| `ParameterStage` | Pushes shared credentials/config to SSM Parameter Store in the target environment. |
| `UsEastCertificateStack` | ACMA certificate in us-east-1 (required for CloudFront). ARN stored in SSM. |
| `DatabaseStack` | Shared database resources. |
| `MainStack` | VPC, hosted zone, container platform, load balancer, and all service constructs. |

### Platform resources (shared, managed by `ContainerPlatform`)

| Resource | Detail |
|---|---|
| **ECS Cluster** | All services run in the same cluster. |
| **CloudMap Namespace** | `kcc-infra.local` — used for internal service discovery between containers. |
| **ALB** | Private ALB with HTTPS listener. Each service registers `host-header` routing rules. |
| **Wildcard Certificate** | Imported from us-east-1 via SSM, used by both the ALB and CloudFront. |
| **Hosted Zone** | Route53 zone imported from account-level parameters. |

### Per-service resources

| Resource | Detail |
|---|---|
| **ECS Task + Service** | Fargate task with configurable CPU/memory. |
| **CloudWatch Log Group** | Structured logs from the container. |
| **CloudFront Distribution** | Public-facing edge for the subdomain, proxying to the ALB via VPC Origin. |
| **Route53 Records** | A + AAAA aliases pointing at the CloudFront distribution. |
| **ALB Target Group** | Registered on the shared listener with host-header routing. |

---

## Helper Constructs Available for Services

| Construct / Utility | Location | Purpose |
|---|---|---|
| `ContainerServiceUtils.allowExecutingCommands(task)` | `src/constructs/ContainerUtils.ts` | Grants ECS exec IAM permissions. |
| `ContainerServiceUtils.setupWritableVolume(...)` | `src/constructs/ContainerUtils.ts` | Adds an ephemeral storage volume with an init container to make directories writable. |
| `ContainerServiceUtils.attachEphemeralStorage(...)` | `src/constructs/ContainerUtils.ts` | Mounts a volume to a container path. |
| `SubdomainCloudfront` | `src/constructs/SubdomainCloudfront.ts` | CloudFront dist + DNS records + LB access rules for a subdomain. |
| `SubdomainCloudfront` passes CloudFront requests with an `API-version: 1.3.1` header and caching disabled. |
| `Statics` | `src/Statics.ts` | Shared constants — project name, account IDs, SSM parameter paths, environment maps. |

---

## Checklist

When adding a new service, go through these steps:

- [ ] Add a `*ServiceConfiguration` interface in `src/ConfigurationInterfaces.ts`
- [ ] Add the service array to the top-level `Configuration` interface in `src/ConfigurationInterfaces.ts`
- [ ] Wire up config values per environment in `src/Configuration.ts`
- [ ] Create `src/services/YourService.ts` implementing `IContainerService`
- [ ] Register the service in `src/MainStack.ts`
- [ ] Run `npm run build && npx cdk diff` to review the CloudFormation changes
- [ ] Deploy via `npx cdk deploy`
