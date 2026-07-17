import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { WebsiteCrawlerConfiguration } from '../src/ConfigurationInterfaces';
import { WebsiteCrawlerScheduledTasks } from '../src/services/WebsiteCrawlerScheduledTasks';

function synth(config: WebsiteCrawlerConfiguration): Template {
  const app = new App();
  const stack = new Stack(app, 'TestStack', { env: { account: '123456789012', region: 'eu-central-1' } });
  const cluster = new Cluster(stack, 'Cluster', { vpc: new Vpc(stack, 'Vpc') });
  new WebsiteCrawlerScheduledTasks(stack, 'website-crawler', { cluster, config });
  return Template.fromStack(stack);
}

const baseConfig: WebsiteCrawlerConfiguration = {
  environment: {},
  sources: [
    { id: 'nijmegen-website', schedule: 'rate(59 minutes)', environment: { TARGET_URL: 'https://www.nijmegen.nl' } },
  ],
};

describe('WebsiteCrawlerScheduledTasks', () => {
  test('uses the new EventBridge Scheduler, not legacy Events rules', () => {
    const template = synth(baseConfig);
    template.resourceCountIs('AWS::Scheduler::Schedule', 1);
    template.resourceCountIs('AWS::Events::Rule', 0);
  });

  test('creates a Fargate ECS target with the configured schedule', () => {
    const template = synth(baseConfig);
    template.hasResourceProperties('AWS::Scheduler::Schedule', {
      ScheduleExpression: 'rate(59 minutes)',
      Target: {
        EcsParameters: { LaunchType: 'FARGATE', TaskCount: 1 },
      },
    });
  });

  describe('parseSchedule', () => {
    test('passes a cron() expression through unchanged', () => {
      const template = synth({ ...baseConfig, sources: [{ id: 'a', schedule: 'cron(0 3 * * ? *)' }] });
      template.hasResourceProperties('AWS::Scheduler::Schedule', { ScheduleExpression: 'cron(0 3 * * ? *)' });
    });

    test('wraps a bare duration in rate()', () => {
      const template = synth({ ...baseConfig, sources: [{ id: 'a', schedule: '1 day' }] });
      template.hasResourceProperties('AWS::Scheduler::Schedule', { ScheduleExpression: 'rate(1 day)' });
    });
  });
});
